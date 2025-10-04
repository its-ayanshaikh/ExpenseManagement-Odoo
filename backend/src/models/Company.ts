import { v4 as uuidv4 } from 'uuid';
import { Company as CompanyInterface } from '../types/database';
import { db } from '../config/database';

export class Company {
  public id: string;
  public name: string;
  public country: string;
  public defaultCurrency: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<CompanyInterface>) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.country = data.country || '';
    this.defaultCurrency = data.default_currency || '';
    this.createdAt = data.created_at || new Date();
    this.updatedAt = data.updated_at || new Date();
  }

  /**
   * Convert Company instance to database format
   * @returns CompanyInterface - Database format object
   */
  public toDatabase(): CompanyInterface {
    return {
      id: this.id,
      name: this.name,
      country: this.country,
      default_currency: this.defaultCurrency,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  /**
   * Create Company from database row
   * @param row - Database row
   * @returns Company - Company instance
   */
  public static fromDatabase(row: CompanyInterface): Company {
    return new Company(row);
  }

  /**
   * Save company to database
   * @returns Promise<Company> - Saved company instance
   */
  public async save(): Promise<Company> {
    this.updatedAt = new Date();
    const companyData = this.toDatabase();
    
    const [savedCompany] = await db('companies')
      .insert(companyData)
      .onConflict('id')
      .merge(['name', 'country', 'default_currency', 'updated_at'])
      .returning('*');
    
    return Company.fromDatabase(savedCompany);
  }

  /**
   * Find company by ID
   * @param id - Company ID
   * @returns Promise<Company | null> - Company instance or null
   */
  public static async findById(id: string): Promise<Company | null> {
    const company = await db('companies').where('id', id).first();
    return company ? Company.fromDatabase(company) : null;
  }

  /**
   * Find company by name
   * @param name - Company name
   * @returns Promise<Company | null> - Company instance or null
   */
  public static async findByName(name: string): Promise<Company | null> {
    const company = await db('companies').where('name', name).first();
    return company ? Company.fromDatabase(company) : null;
  }

  /**
   * Delete company by ID
   * @param id - Company ID
   * @returns Promise<boolean> - True if deleted successfully
   */
  public static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await db('companies').where('id', id).del();
    return deletedCount > 0;
  }
}