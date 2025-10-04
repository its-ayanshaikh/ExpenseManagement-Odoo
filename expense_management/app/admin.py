from django.contrib import admin
from .models import (
    Company, Department, User,
    ApprovalRule, ApprovalFlow, FlowStep,
    Expense, ExpenseApproval
)


# ----------------------------
# Inline Configurations
# ----------------------------

@admin.register(FlowStep)
class FlowStepAdmin(admin.ModelAdmin):
    list_display = ["flow", "order", "approver", "is_manager_step", "is_high_priority"]
    list_filter = ["flow__company", "flow__department"]
    search_fields = ["flow__name", "approver__username"]
    autocomplete_fields = ["flow", "approver"]
    ordering = ["flow", "order"]
    
class FlowStepInline(admin.TabularInline):
    model = FlowStep
    extra = 1
    fields = ["order", "approver", "is_manager_step", "is_high_priority"]
    ordering = ["order"]


class ExpenseApprovalInline(admin.TabularInline):
    model = ExpenseApproval
    extra = 0
    readonly_fields = ["approver", "flow_step", "status", "comments", "acted_at"]
    can_delete = False


# ----------------------------
# Company Admin
# ----------------------------
@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "country", "currency_symbol", "currency_code", "created_at"]
    search_fields = ["name", "country", "currency_code"]
    list_filter = ["country", "currency_code"]
    readonly_fields = ["created_at"]


# ----------------------------
# Department Admin
# ----------------------------
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "company"]
    list_filter = ["company"]
    search_fields = ["name", "company__name"]


# ----------------------------
# Custom User Admin
# ----------------------------
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["username", "email", "role", "department", "company", "manager"]
    list_filter = ["role", "company", "department"]
    search_fields = ["username", "email", "company__name"]
    autocomplete_fields = ["company", "department", "manager"]

    fieldsets = (
        ("User Info", {"fields": ("username", "email", "first_name", "last_name", "password")}),
        ("Company Details", {"fields": ("company", "department", "role", "manager")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )


# ----------------------------
# Approval Rule Admin
# ----------------------------
@admin.register(ApprovalRule)
class ApprovalRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "rule_type", "minimum_percentage", "specific_approver", "is_active"]
    list_filter = ["company", "rule_type", "is_active"]
    search_fields = ["name", "company__name"]
    autocomplete_fields = ["company", "specific_approver"]
    readonly_fields = []
    fieldsets = (
        ("Basic Info", {"fields": ("company", "name", "rule_type", "is_active")}),
        ("Rule Settings", {"fields": ("minimum_percentage", "specific_approver")}),
    )


# ----------------------------
# Approval Flow Admin
# ----------------------------
@admin.register(ApprovalFlow)
class ApprovalFlowAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "department", "min_amount", "max_amount", "rule", "created_at"]
    list_filter = ["company", "department"]
    search_fields = ["name", "company__name", "department__name"]
    inlines = [FlowStepInline]
    autocomplete_fields = ["company", "department", "rule"]
    readonly_fields = ["created_at"]
    ordering = ["company", "department", "min_amount"]

    fieldsets = (
        ("Flow Information", {
            "fields": ("company", "name", "description", "department")
        }),
        ("Amount Range", {
            "fields": ("min_amount", "max_amount")
        }),
        ("Approval Rule", {
            "fields": ("rule",)
        }),
        ("Metadata", {
            "fields": ("created_at",)
        }),
    )


# ----------------------------
# Expense Admin
# ----------------------------
@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "id", "employee", "category", "amount", "currency_symbol", "currency_code",
        "converted_amount", "converted_currency_symbol", "status", "approval_rule", "flow", "created_at"
    ]
    list_filter = ["status", "employee__company", "employee__department", "category"]
    search_fields = ["employee__username", "category", "approval_rule__name", "flow__name"]
    inlines = [ExpenseApprovalInline]
    autocomplete_fields = ["employee", "approval_rule", "flow"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Expense Details", {
            "fields": ("employee", "category", "description", "expense_date", "receipt")
        }),
        ("Amounts", {
            "fields": (
                "amount", "currency_symbol", "currency_code",
                "converted_amount", "converted_currency_symbol", "converted_currency_code"
            )
        }),
        ("Approval Configuration", {
            "fields": ("status", "approval_rule", "flow")
        }),
        ("Timestamps", {
            "fields": ("created_at",)
        }),
    )


# ----------------------------
# Expense Approval Admin
# ----------------------------
@admin.register(ExpenseApproval)
class ExpenseApprovalAdmin(admin.ModelAdmin):
    list_display = ["expense", "approver", "status", "flow_step", "acted_at"]
    list_filter = ["status", "approver__company", "approver__department"]
    search_fields = ["expense__id", "approver__username", "approver__department__name"]
    autocomplete_fields = ["expense", "approver", "flow_step"]
    readonly_fields = ["acted_at"]
    ordering = ["-acted_at"]
