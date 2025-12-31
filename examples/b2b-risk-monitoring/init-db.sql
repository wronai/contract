-- Reclapp B2B Risk Monitoring - Database Initialization
-- PostgreSQL Read Models

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    segment VARCHAR(50) CHECK (segment IN ('enterprise', 'sme', 'startup', 'micro')),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100) DEFAULT 50,
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    payment_terms INTEGER CHECK (payment_terms >= 7 AND payment_terms <= 90) DEFAULT 30,
    status VARCHAR(50) CHECK (status IN ('pending', 'active', 'suspended', 'churned')) DEFAULT 'pending',
    monitoring_level VARCHAR(50) CHECK (monitoring_level IN ('standard', 'enhanced', 'intensive')) DEFAULT 'standard',
    last_assessment TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_nip ON customers(nip);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_risk_score ON customers(risk_score);
CREATE INDEX idx_customers_segment ON customers(segment);

-- ============================================================================
-- CONTRACTORS
-- ============================================================================
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100) DEFAULT 50,
    performance_rating DECIMAL(3, 1) CHECK (performance_rating >= 0 AND performance_rating <= 10),
    total_order_value DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) CHECK (status IN ('active', 'probation', 'suspended', 'blacklisted')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contractors_status ON contractors(status);
CREATE INDEX idx_contractors_risk_score ON contractors(risk_score);

-- ============================================================================
-- RISK ASSESSMENTS
-- ============================================================================
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    risk_score INTEGER NOT NULL,
    previous_score INTEGER,
    factors JSONB NOT NULL DEFAULT '{}',
    causal_influences JSONB NOT NULL DEFAULT '{}',
    confidence DECIMAL(5, 4) NOT NULL,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_assessment TIMESTAMP,
    assessor VARCHAR(100) DEFAULT 'system'
);

CREATE INDEX idx_risk_assessments_entity ON risk_assessments(entity_type, entity_id);
CREATE INDEX idx_risk_assessments_date ON risk_assessments(assessment_date DESC);
CREATE INDEX idx_risk_assessments_score ON risk_assessments(risk_score);

-- ============================================================================
-- INTERVENTIONS
-- ============================================================================
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    intervention_type VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    expected_effects JSONB NOT NULL DEFAULT '{}',
    actual_effects JSONB,
    confidence DECIMAL(5, 4) NOT NULL,
    sandbox BOOLEAN DEFAULT true,
    status VARCHAR(50) CHECK (status IN ('pending', 'applied', 'verified', 'rolled_back', 'failed')) DEFAULT 'pending',
    applied_at TIMESTAMP,
    verified_at TIMESTAMP,
    approved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interventions_entity ON interventions(entity_type, entity_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_type ON interventions(intervention_type);

-- ============================================================================
-- CAUSAL PREDICTIONS
-- ============================================================================
CREATE TABLE causal_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID REFERENCES interventions(id),
    model_version VARCHAR(50) NOT NULL,
    predicted_effects JSONB NOT NULL,
    observed_effects JSONB,
    deviation DECIMAL(5, 4),
    confidence DECIMAL(5, 4) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'verified', 'anomaly', 'expired')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

CREATE INDEX idx_causal_predictions_intervention ON causal_predictions(intervention_id);
CREATE INDEX idx_causal_predictions_status ON causal_predictions(status);

-- ============================================================================
-- ANOMALIES
-- ============================================================================
CREATE TABLE anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES causal_predictions(id),
    anomaly_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    description TEXT NOT NULL,
    affected_path JSONB,
    suggested_action TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_resolved ON anomalies(resolved);

-- ============================================================================
-- MODEL ADJUSTMENTS
-- ============================================================================
CREATE TABLE model_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target VARCHAR(255) NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL,
    previous_value DECIMAL(10, 6) NOT NULL,
    new_value DECIMAL(10, 6) NOT NULL,
    reason TEXT,
    approved BOOLEAN DEFAULT false,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_model_adjustments_approved ON model_adjustments(approved);
CREATE INDEX idx_model_adjustments_applied ON model_adjustments(applied);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    target VARCHAR(255),
    parameters JSONB,
    result JSONB,
    allowed BOOLEAN NOT NULL,
    requires_approval BOOLEAN DEFAULT false,
    confidence DECIMAL(5, 4),
    reasoning TEXT,
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_contract ON audit_log(contract_id);
CREATE INDEX idx_audit_log_session ON audit_log(session_id);
CREATE INDEX idx_audit_log_action ON audit_log(action_type);
CREATE INDEX idx_audit_log_date ON audit_log(created_at DESC);

-- ============================================================================
-- ALERTS
-- ============================================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50),
    entity_id UUID,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);

-- ============================================================================
-- DASHBOARD METRICS (Materialized View)
-- ============================================================================
CREATE MATERIALIZED VIEW mv_risk_dashboard AS
SELECT
    'customers' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    AVG(risk_score) as avg_risk_score,
    COUNT(*) FILTER (WHERE risk_score >= 85) as critical_risk_count,
    COUNT(*) FILTER (WHERE risk_score >= 70 AND risk_score < 85) as high_risk_count,
    COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 70) as medium_risk_count,
    COUNT(*) FILTER (WHERE risk_score < 50) as low_risk_count,
    SUM(credit_limit) as total_credit_exposure,
    MAX(updated_at) as last_update
FROM customers

UNION ALL

SELECT
    'contractors' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    AVG(risk_score) as avg_risk_score,
    COUNT(*) FILTER (WHERE risk_score >= 85) as critical_risk_count,
    COUNT(*) FILTER (WHERE risk_score >= 70 AND risk_score < 85) as high_risk_count,
    COUNT(*) FILTER (WHERE risk_score >= 50 AND risk_score < 70) as medium_risk_count,
    COUNT(*) FILTER (WHERE risk_score < 50) as low_risk_count,
    SUM(total_order_value) as total_credit_exposure,
    MAX(updated_at) as last_update
FROM contractors;

CREATE UNIQUE INDEX idx_mv_risk_dashboard ON mv_risk_dashboard(entity_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_contractors_updated_at
    BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Refresh dashboard materialized view
CREATE OR REPLACE FUNCTION refresh_risk_dashboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_risk_dashboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
-- ============================================================================
INSERT INTO customers (nip, name, segment, risk_score, credit_limit, status) VALUES
    ('1234567890', 'Acme Corporation', 'enterprise', 35, 500000, 'active'),
    ('2345678901', 'Beta Industries', 'sme', 55, 150000, 'active'),
    ('3456789012', 'Gamma Startup', 'startup', 72, 50000, 'active'),
    ('4567890123', 'Delta Services', 'sme', 45, 200000, 'active'),
    ('5678901234', 'Epsilon Tech', 'micro', 88, 25000, 'suspended');

INSERT INTO contractors (name, category, risk_score, performance_rating, status) VALUES
    ('Supplier One', 'raw_materials', 30, 8.5, 'active'),
    ('Supplier Two', 'components', 45, 7.2, 'active'),
    ('Supplier Three', 'services', 65, 6.0, 'probation');

-- Done
SELECT 'Database initialized successfully' as status;
