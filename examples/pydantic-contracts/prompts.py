"""
Test Prompts for Full Lifecycle Testing

These prompts can be used to test the full lifecycle of Reclapp 2.3.
"""

# Simple prompts for quick testing
SIMPLE_PROMPTS = [
    "Create a notes app",
    "Create a todo list with tasks",
    "Create a contacts manager",
]

# Medium complexity prompts
MEDIUM_PROMPTS = [
    "Create a blog platform with posts and comments",
    "Create an inventory system with products and warehouses",
    "Create a booking system with resources and reservations",
]

# Complex prompts
COMPLEX_PROMPTS = [
    "Create a CRM system with contacts, companies, and deals. Include email validation and deal stages.",
    "Create an e-commerce backend with products, categories, orders, and customers",
    "Create a project management system with projects, tasks, users, and milestones",
]

# All prompts for batch testing
ALL_PROMPTS = SIMPLE_PROMPTS + MEDIUM_PROMPTS + COMPLEX_PROMPTS


def get_test_prompts(level: str = "simple") -> list:
    """Get prompts by complexity level"""
    if level == "simple":
        return SIMPLE_PROMPTS
    elif level == "medium":
        return MEDIUM_PROMPTS
    elif level == "complex":
        return COMPLEX_PROMPTS
    else:
        return ALL_PROMPTS


if __name__ == "__main__":
    print("Test Prompts for Reclapp 2.3\n")
    
    print("Simple:")
    for p in SIMPLE_PROMPTS:
        print(f"  - {p}")
    
    print("\nMedium:")
    for p in MEDIUM_PROMPTS:
        print(f"  - {p}")
    
    print("\nComplex:")
    for p in COMPLEX_PROMPTS:
        print(f"  - {p}")
