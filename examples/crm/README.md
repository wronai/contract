# CRM Example

Customer Relationship Management system with contacts, deals, and activities.

## Features

- **Contact Management**: Contacts and companies
- **Deal Pipeline**: Visual sales pipeline
- **Activity Tracking**: Calls, emails, meetings
- **Task Management**: Follow-ups and reminders
- **Email Integration**: Track email opens and clicks
- **Lead Scoring**: Automatic lead qualification
- **Forecasting**: Revenue predictions

## Contract Overview

```dsl
ENTITY Contact       - Customer contacts
ENTITY Company       - Business accounts
ENTITY Deal          - Sales opportunities
ENTITY Activity      - Sales activities
ENTITY Email         - Email tracking
ENTITY Meeting       - Calendar integration
ENTITY Task          - To-do management
```

## Quick Start

```bash
# Generate application
reclapp generate ./contracts/main.reclapp -o ./src -t full-stack

# Install dependencies
cd src && npm install

# Run development
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/crm
EMAIL_API_URL=https://email.example.com
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CALENDAR_KEY=...
```

## Dashboards

- **Sales Pipeline**: Deal stages and values
- **Sales Forecast**: Revenue predictions
- **Team Performance**: Rep leaderboard
- **Activity Analytics**: Call, email, meeting metrics
- **Contact Insights**: Lead sources, conversion

## Workflows

- **LeadNurturing**: Automated lead follow-up
- **DealClosing**: Proposal to close automation

## Scoring Model

| Activity       | Points |
| -------------- | ------ |
| Email Open     | 5      |
| Email Click    | 10     |
| Meeting        | 20     |
| Call           | 15     |
| Website Visit  | 3      |
