"""
Entity Contract Tests

Tests for Pydantic entity contracts.

@version 2.3.0
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

import sys
sys.path.insert(0, '.')

from pycontracts.entities import Contact, Company, Deal, User, Task, Project


class TestContact:
    """Tests for Contact entity"""
    
    def test_valid_contact(self):
        contact = Contact(
            id="123",
            email="test@example.com",
            firstName="John",
            lastName="Doe"
        )
        assert contact.email == "test@example.com"
        assert contact.full_name == "John Doe"
    
    def test_contact_with_all_fields(self):
        contact = Contact(
            id="123",
            email="test@example.com",
            firstName="John",
            lastName="Doe",
            phone="+1 555-1234",
            companyId="comp-456",
            position="Developer",
            notes="Some notes"
        )
        assert contact.phone == "+1 555-1234"
        assert contact.company_id == "comp-456"
    
    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            Contact(
                id="123",
                email="not-an-email",
                firstName="John",
                lastName="Doe"
            )
    
    def test_empty_first_name(self):
        with pytest.raises(ValidationError):
            Contact(
                id="123",
                email="test@example.com",
                firstName="",
                lastName="Doe"
            )


class TestCompany:
    """Tests for Company entity"""
    
    def test_valid_company(self):
        company = Company(
            id="123",
            name="Acme Corp"
        )
        assert company.name == "Acme Corp"
    
    def test_company_with_size(self):
        company = Company(
            id="123",
            name="Acme Corp",
            size="51-200"
        )
        assert company.size == "51-200"
    
    def test_invalid_size(self):
        with pytest.raises(ValidationError):
            Company(
                id="123",
                name="Acme Corp",
                size="invalid-size"
            )
    
    def test_negative_revenue(self):
        with pytest.raises(ValidationError):
            Company(
                id="123",
                name="Acme Corp",
                revenue=-1000
            )


class TestDeal:
    """Tests for Deal entity"""
    
    def test_valid_deal(self):
        deal = Deal(
            id="123",
            title="Big Deal",
            value=50000
        )
        assert deal.value == 50000
        assert deal.stage == "lead"
        assert deal.currency == "USD"
    
    def test_weighted_value(self):
        deal = Deal(
            id="123",
            title="Big Deal",
            value=100000,
            probability=25
        )
        assert deal.weighted_value == 25000
    
    def test_invalid_probability(self):
        with pytest.raises(ValidationError):
            Deal(
                id="123",
                title="Deal",
                value=1000,
                probability=150
            )
    
    def test_invalid_stage(self):
        with pytest.raises(ValidationError):
            Deal(
                id="123",
                title="Deal",
                value=1000,
                stage="invalid_stage"
            )


class TestUser:
    """Tests for User entity"""
    
    def test_valid_user(self):
        user = User(
            id="123",
            email="user@example.com",
            name="Test User"
        )
        assert user.role == "user"
        assert user.is_active == True
    
    def test_admin_user(self):
        user = User(
            id="123",
            email="admin@example.com",
            name="Admin User",
            role="admin"
        )
        assert user.role == "admin"


class TestTask:
    """Tests for Task entity"""
    
    def test_valid_task(self):
        task = Task(
            id="123",
            title="Complete task"
        )
        assert task.status == "todo"
        assert task.priority == "medium"
    
    def test_task_with_priority(self):
        task = Task(
            id="123",
            title="Urgent task",
            priority="urgent",
            status="in_progress"
        )
        assert task.priority == "urgent"
        assert task.status == "in_progress"


class TestProject:
    """Tests for Project entity"""
    
    def test_valid_project(self):
        project = Project(
            id="123",
            name="New Project"
        )
        assert project.status == "planning"
    
    def test_project_with_budget(self):
        project = Project(
            id="123",
            name="Funded Project",
            budget=100000,
            status="active"
        )
        assert project.budget == 100000
    
    def test_negative_budget(self):
        with pytest.raises(ValidationError):
            Project(
                id="123",
                name="Project",
                budget=-5000
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
