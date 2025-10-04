from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver


# ----------------------------
# Company Model
# ----------------------------
class Company(models.Model):
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=100)

    currency_code = models.CharField(max_length=10)   # e.g., "INR", "USD"
    currency_symbol = models.CharField(max_length=5)  # e.g., "₹", "$"

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.currency_symbol}{self.currency_code})"


# ----------------------------
# Department Model
# ----------------------------
class Department(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=100)  # e.g., Finance, HR, Sales, Director Office

    def __str__(self):
        return f"{self.name} ({self.company.name})"


# ----------------------------
# Custom User Model
# ----------------------------

class User(AbstractUser):
    ROLE_CHOICES = [
        ("ADMIN", "Admin"),
        ("MANAGER", "Manager"),
        ("EMPLOYEE", "Employee"),
    ]

    company = models.ForeignKey("Company", on_delete=models.CASCADE, related_name="users", null=True, blank=True)
    department = models.ForeignKey("Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="EMPLOYEE")
    manager = models.ForeignKey(
        "self",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="employees"
    )

    # 🔥 Fix for reverse accessor clash
    groups = models.ManyToManyField(
        Group,
        related_name="custom_user_groups",  # unique related name
        blank=True,
        help_text="The groups this user belongs to.",
        verbose_name="groups",
    )

    user_permissions = models.ManyToManyField(
        Permission,
        related_name="custom_user_permissions",
        blank=True,
        help_text="Specific permissions for this user.",
        verbose_name="user permissions",
    )

    def __str__(self):
        dept = f" - {self.department.name}" if self.department else ""
        return f"{self.username} ({self.role}{dept})"


# ----------------------------
# Approval Rule Model
# ----------------------------
class ApprovalRule(models.Model):
    RULE_TYPE_CHOICES = [
        ("PERCENTAGE", "Percentage Rule"),    # e.g., 60% approvals required
        ("SPECIFIC", "Specific Approver Rule"),  # e.g., CFO approval auto-approves
        ("HYBRID", "Hybrid Rule"),           # combination of both
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="approval_rules")
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)

    # for percentage rule
    minimum_percentage = models.IntegerField(null=True, blank=True)  # e.g., 60

    # for specific approver rule
    specific_approver = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="special_rules"
    )

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.rule_type})"


# ----------------------------
# Approval Flow (sequence container)
# ----------------------------
class ApprovalFlow(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="approval_flows")
    name = models.CharField(max_length=255)   # e.g., "Travel Expense Flow"
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="flows")

    min_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # link to rule
    rule = models.ForeignKey(
        ApprovalRule, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="flows"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        dept = f" - {self.department.name}" if self.department else ""
        return f"{self.name}{dept}"


# ----------------------------
# Flow Step (sequence of approvers)
# ----------------------------
class FlowStep(models.Model):
    flow = models.ForeignKey(ApprovalFlow, on_delete=models.CASCADE, related_name="steps")
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="flow_steps")
    order = models.IntegerField()  # 1=Manager, 2=Finance, 3=Director
    is_manager_step = models.BooleanField(default=False)  # if this step is "employee's manager"
    is_high_priority = models.BooleanField(default=False)  # CFO / Director → auto-approve

    def __str__(self):
        return f"Step {self.order} - {self.approver.username}"


# ----------------------------
# Expense Model
# ----------------------------
class Expense(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expenses")
    description = models.TextField()
    category = models.CharField(max_length=100)

    # original values (user submitted)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency_code = models.CharField(max_length=10)   # e.g., "USD"
    currency_symbol = models.CharField(max_length=5)  # e.g., "$"

    # converted values (company base currency)
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2)
    converted_currency_code = models.CharField(max_length=10)   # e.g., "INR"
    converted_currency_symbol = models.CharField(max_length=5)  # e.g., "₹"

    expense_date = models.DateField()
    receipt = models.FileField(upload_to="receipts/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    created_at = models.DateTimeField(auto_now_add=True)

    approval_rule = models.ForeignKey(
        ApprovalRule, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="expenses"
    )
    flow = models.ForeignKey(
        ApprovalFlow, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="expenses"
    )

    def __str__(self):
        return f"Expense {self.id} - {self.employee.username} ({self.status})"


# ----------------------------
# Expense Approval (runtime tracking)
# ----------------------------
class ExpenseApproval(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="approvals")
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="approvals_to_review")
    flow_step = models.ForeignKey(FlowStep, on_delete=models.SET_NULL, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    comments = models.TextField(blank=True)
    acted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Approval for {self.expense.id} by {self.approver.username} - {self.status}"


# ----------------------------
# Auto-create Company when Admin signs up
# ----------------------------
@receiver(post_save, sender=User)
def create_company_for_admin(sender, instance, created, **kwargs):
    if created and instance.role == "ADMIN" and instance.company is None:
        company_name = getattr(instance, "_company_name", None)
        country = getattr(instance, "_country", None)
        currency_code = getattr(instance, "_currency_code", None)
        currency_symbol = getattr(instance, "_currency_symbol", None)

        if company_name and country and currency_code and currency_symbol:
            company = Company.objects.create(
                name=company_name,
                country=country,
                currency_code=currency_code,
                currency_symbol=currency_symbol
            )
            instance.company = company
            instance.save()
