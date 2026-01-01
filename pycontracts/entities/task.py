"""
Task Entity Contract

@version 2.3.0
"""

from datetime import datetime, date
from typing import Literal, Optional
from pydantic import Field
from ..base import BaseEntity


TaskStatus = Literal["todo", "in_progress", "done", "cancelled"]
TaskPriority = Literal["low", "medium", "high", "urgent"]


class Task(BaseEntity):
    """Task/Todo entity"""
    id: str = Field(..., description="Unique identifier")
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    assignee_id: Optional[str] = Field(None, alias="assigneeId")
    project_id: Optional[str] = Field(None, alias="projectId")
    due_date: Optional[date] = Field(None, alias="dueDate")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
