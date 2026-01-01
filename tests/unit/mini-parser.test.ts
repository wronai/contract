/**
 * Mini-DSL Parser Tests
 * 
 * Tests for the compact RCL format parser
 */

import { parseMini, parseMiniFile, miniToIR, irToMini, validateMiniSyntax } from '../../dsl/parser/mini';
import * as path from 'path';
import * as fs from 'fs';

describe('Mini-DSL Parser', () => {
  describe('parseMini', () => {
    it('should parse a simple entity declaration', () => {
      const source = `
        entity Contact {
          email       text      @unique
          firstName   text      @required
          lastName    text
          age         int?
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast.statements).toHaveLength(1);
      expect(result.ast.statements[0].type).toBe('EntityDeclaration');
      expect(result.ast.statements[0].name).toBe('Contact');
      expect(result.ast.statements[0].fields).toHaveLength(4);
    });

    it('should parse enum declarations', () => {
      const source = `
        enum Status { Active, Pending, Suspended }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('EnumDeclaration');
      expect(result.ast.statements[0].name).toBe('Status');
      expect(result.ast.statements[0].values).toEqual(['Active', 'Pending', 'Suspended']);
    });

    it('should parse app declaration', () => {
      const source = `
        app "CRM System" {
          version: "2.0.0"
          description: "Customer management"
          author: "Reclapp"
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('AppDeclaration');
      expect(result.ast.statements[0].name).toBe('CRM System');
      expect(result.ast.statements[0].version).toBe('2.0.0');
    });

    it('should parse pipeline declarations', () => {
      const source = `
        pipeline DataProcessing {
          input: [Event.stream, Data.changes]
          transform: [validate, process, store]
          output: [dashboard, notifications]
          schedule: "0 * * * *"
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('PipelineDeclaration');
      expect(result.ast.statements[0].name).toBe('DataProcessing');
      expect(result.ast.statements[0].schedule).toBe('0 * * * *');
    });

    it('should parse pipeline output as DotPath (e.g. Entity.update)', () => {
      const source = `
        pipeline RegistrySync {
          input: Customer.pending
          transform: [enrichFromKRS, enrichFromCEIDG]
          output: Customer.update
          schedule: "0 */6 * * *"
        }
      `;

      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast.statements[0].type).toBe('PipelineDeclaration');
      expect(result.ast.statements[0].output).toEqual(['Customer.update']);
    });

    it('should parse pipeline output list with DotPath values', () => {
      const source = `
        pipeline DashboardRefresh {
          input: MetricUpdated.stream
          transform: [aggregateByDashboard, updateCache]
          output: [dashboard.refresh, Report.create]
        }
      `;

      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast.statements[0].type).toBe('PipelineDeclaration');
      expect(result.ast.statements[0].output).toEqual(['dashboard.refresh', 'Report.create']);
    });

    it('should parse alert declarations', () => {
      const source = `
        alert "High Risk" {
          entity: Customer
          when: riskScore > 80
          notify: [email, slack]
          severity: critical
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('AlertDeclaration');
      expect(result.ast.statements[0].name).toBe('High Risk');
      expect(result.ast.statements[0].severity).toBe('critical');
    });

    it('should parse dashboard declarations', () => {
      const source = `
        dashboard "Sales Overview" {
          entity: Deal
          metrics: [totalValue, winRate, avgSize]
          stream: realtime
          layout: grid
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('DashboardDeclaration');
      expect(result.ast.statements[0].name).toBe('Sales Overview');
      expect(result.ast.statements[0].streamMode).toBe('realtime');
    });

    it('should parse source declarations', () => {
      const source = `
        source apiData {
          type: rest
          url: "https://api.example.com"
          auth: bearer
          cache: "5m"
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('SourceDeclaration');
      expect(result.ast.statements[0].name).toBe('apiData');
      expect(result.ast.statements[0].auth).toBe('bearer');
    });

    it('should parse event declarations', () => {
      const source = `
        event OrderPlaced {
          orderId: uuid
          customerId: uuid
          total: decimal
          timestamp: datetime
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('EventDeclaration');
      expect(result.ast.statements[0].name).toBe('OrderPlaced');
      expect(result.ast.statements[0].fields).toHaveLength(4);
    });

    it('should parse config declarations', () => {
      const source = `
        config app {
          defaultCurrency: "USD"
          maxRetries: 3
          enabled: true
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements[0].type).toBe('ConfigDeclaration');
      expect(result.ast.statements[0].name).toBe('app');
    });

    it('should parse relation types', () => {
      const source = `
        entity Order {
          customer    -> Customer @required
          items       <- OrderItem[]
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      const fields = result.ast.statements[0].fields;
      expect(fields[0].fieldType.direction).toBe('belongsTo');
      expect(fields[1].fieldType.direction).toBe('hasMany');
    });

    it('should parse inline enum types', () => {
      const source = `
        entity Product {
          status      enum(Draft, Active, Archived)
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      const field = result.ast.statements[0].fields[0];
      expect(field.fieldType.type).toBe('EnumType');
      expect(field.fieldType.values).toEqual(['Draft', 'Active', 'Archived']);
    });

    it('should parse money types', () => {
      const source = `
        entity Invoice {
          amount      money(PLN)
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      const field = result.ast.statements[0].fields[0];
      expect(field.fieldType.type).toBe('MoneyType');
      expect(field.fieldType.currency).toBe('PLN');
    });

    it('should parse range types', () => {
      const source = `
        entity Rating {
          score       int(1..5)
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      const field = result.ast.statements[0].fields[0];
      expect(field.fieldType.type).toBe('RangeType');
      expect(field.fieldType.min).toBe(1);
      expect(field.fieldType.max).toBe(5);
    });

    it('should parse default values', () => {
      const source = `
        entity Settings {
          enabled     bool      = true
          retries     int       = 3
          name        text      = "default"
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      const fields = result.ast.statements[0].fields;
      expect(fields[0].defaultValue).toBe(true);
      expect(fields[1].defaultValue).toBe(3);
      expect(fields[2].defaultValue).toBe('default');
    });

    it('should handle comments', () => {
      const source = `
        // This is a comment
        entity Test {
          // Field comment
          name        text
        }
        /* Multi-line
           comment */
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      expect(result.ast.statements).toHaveLength(1);
    });

    it('should return errors for invalid syntax', () => {
      const source = `
        entity {
          name text
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validateMiniSyntax', () => {
    it('should validate correct syntax', () => {
      const source = `
        entity User {
          email text @unique
        }
      `;
      
      const result = validateMiniSyntax(source);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid syntax', () => {
      const source = `
        entity User
          email text
        }
      `;
      
      const result = validateMiniSyntax(source);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('miniToIR', () => {
    it('should convert AST to intermediate representation', () => {
      const source = `
        app "Test App" {
          version: "1.0.0"
        }

        entity User {
          email       text      @unique @required
          name        text
          isActive    bool      = true
        }

        enum Status { Active, Inactive }

        alert "User Alert" {
          entity: User
          when: isActive == false
          notify: [email]
          severity: low
        }
      `;
      
      const parseResult = parseMini(source);
      expect(parseResult.success).toBe(true);
      
      const ir = miniToIR(parseResult.ast);
      expect(ir.app.name).toBe('Test App');
      expect(ir.app.version).toBe('1.0.0');
      expect(ir.entities).toHaveLength(1);
      expect(ir.entities[0].name).toBe('User');
      expect(ir.enums).toHaveLength(1);
      expect(ir.alerts).toHaveLength(1);
    });
  });

  describe('irToMini', () => {
    it('should convert IR back to Mini-DSL source', () => {
      const ir = {
        app: {
          name: 'Test App',
          version: '1.0.0'
        },
        entities: [{
          name: 'User',
          fields: [
            { name: 'email', type: 'String', unique: true },
            { name: 'name', type: 'String' }
          ]
        }],
        enums: [{ name: 'Status', values: ['Active', 'Inactive'] }],
        events: [],
        pipelines: [],
        alerts: [],
        dashboards: [],
        sources: [],
        workflows: [],
        config: {}
      };
      
      const source = irToMini(ir);
      expect(source).toContain('app "Test App"');
      expect(source).toContain('entity User');
      expect(source).toContain('enum Status');
    });
  });

  describe('parseMiniFile', () => {
    const examplesDir = path.join(__dirname, '../../examples');
    
    const rclFiles = [
      'crm/contracts/main.reclapp.rcl',
      'e-commerce/contracts/main.reclapp.rcl',
      'b2b-onboarding/contracts/onboarding.reclapp.rcl',
      'monitoring/contracts/contractor-monitoring.reclapp.rcl',
      'reporting/contracts/analytics.reclapp.rcl',
      'web-dashboard/contracts/analytics.reclapp.rcl',
      'desktop-electron/contracts/investment.reclapp.rcl',
      'saas-starter/contracts/main.reclapp.rcl'
    ];

    rclFiles.forEach(file => {
      const filePath = path.join(examplesDir, file);
      
      it(`should parse ${file}`, () => {
        if (fs.existsSync(filePath)) {
          const result = parseMiniFile(filePath);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error(`Parse errors in ${file}:`, result.errors);
          }
          expect(result.ast).toBeDefined();
          expect(result.ast.statements.length).toBeGreaterThan(0);
        } else {
          console.warn(`File not found: ${filePath}`);
        }
      });
    });
  });

  describe('Complex Contract Parsing', () => {
    it('should parse a complete CRM-like contract', () => {
      const source = `
        app "CRM" {
          version: "2.0.0"
          description: "Customer Relationship Management"
        }

        enum DealStage { Lead, Qualified, Won, Lost }

        entity Contact {
          email       text      @unique @required
          firstName   text      @required
          lastName    text      @required
          company     -> Company?
          score       int(0..100) = 50
          tags        text[]?
          createdAt   datetime  @generated
        }

        entity Company {
          name        text      @required
          domain      text?     @unique
          contacts    <- Contact[]
        }

        entity Deal {
          name        text      @required
          company     -> Company?
          stage       DealStage = Lead
          amount      money(USD)
          probability int(0..100) = 50
        }

        event DealWon {
          dealId: uuid
          amount: decimal
          timestamp: datetime
        }

        pipeline LeadScoring {
          input: [Contact.created, Activity.stream]
          transform: [calculateScore, updateContact]
          output: dashboard
          schedule: "0 * * * *"
        }

        alert "Deal at Risk" {
          entity: Deal
          when: probability < 30 && amount > 50000
          notify: [slack, email]
          severity: high
        }

        dashboard "Sales Pipeline" {
          entity: Deal
          metrics: [totalValue, byStage, winRate]
          stream: realtime
          layout: grid
        }

        source crmApi {
          type: rest
          url: "https://api.crm.example.com"
          auth: oauth2
          cache: "5m"
        }

        config sales {
          defaultCurrency: "USD"
          fiscalYearStart: "01-01"
        }
      `;
      
      const result = parseMini(source);
      expect(result.success).toBe(true);
      
      const statements = result.ast.statements;
      const types = statements.map((s: any) => s.type);
      
      expect(types).toContain('AppDeclaration');
      expect(types).toContain('EnumDeclaration');
      expect(types).toContain('EntityDeclaration');
      expect(types).toContain('EventDeclaration');
      expect(types).toContain('PipelineDeclaration');
      expect(types).toContain('AlertDeclaration');
      expect(types).toContain('DashboardDeclaration');
      expect(types).toContain('SourceDeclaration');
      expect(types).toContain('ConfigDeclaration');
    });
  });
});
