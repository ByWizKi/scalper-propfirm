# Scalper Propfirm

Professional propfirm account management platform

A modern Next.js application for managing and tracking your propfirm accounts, PnL, withdrawals, and performance.

[![Version](https://img.shields.io/badge/version-1.0.3-blue.svg)](https://github.com/ByWizKi/scalper-propfirm/releases)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

### Account Management
- Support for multiple propfirms (TopStep, TakeProfitTrader, APEX, FTMO, etc.)
- Management of evaluation and funded accounts
- Tracking of status and propfirm-specific rules
- Linking between evaluation and funded accounts

### Performance Tracking
- Daily PnL recording
- Monthly calendar with weekly summaries
- Detailed statistics per account
- Automatic metric calculations (ROI, daily average, best day)

### Withdrawal Management
- Withdrawal system with propfirm-specific rules
- Automatic tax calculations (20% for TakeProfitTrader)
- Trading cycle management (TopStep)
- USD/EUR conversion for all amounts

### Dashboard
- Overview of accounts and performance
- Expense and net withdrawal calendars
- Real-time statistics
- Responsive and modern interface

### Security
- Secure authentication with NextAuth.js
- Unique username login
- Secure password change
- Cookie and token protection
- Secure HTTP headers

## Installation

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+
- Git

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/ByWizKi/scalper-propfirm.git
cd scalper-propfirm
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and fill in the variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/propfirm?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
NEXT_PUBLIC_APP_NAME="Scalper Propfirm"
NEXT_PUBLIC_APP_VERSION="1.0.3"
```

4. **Initialize the database**
```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Command              | Description                                    |
|----------------------|------------------------------------------------|
| `npm run dev`        | Start development server                       |
| `npm run build`      | Create production build                        |
| `npm start`          | Start production server                        |
| `npm run lint`       | Check code with ESLint                         |
| `npm run test`       | Run unit tests                                 |
| `npm run test:watch` | Run tests in watch mode                        |
| `npm run test:coverage` | Run tests with coverage report             |
| `npm run db:generate`| Generate Prisma client                         |
| `npm run db:push`    | Push schema changes to database                |
| `npm run db:migrate` | Create and apply migration                     |
| `npm run db:studio`  | Open Prisma Studio interface                   |

## Architecture

### Technology Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: NextAuth.js
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier, Husky, Commitlint

### Project Structure

```
scalper-propfirm/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Prisma migrations
├── public/
│   ├── icon.svg               # Application icon
│   ├── favicon.svg            # Favicon
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # SEO robots.txt
│   └── sitemap.xml            # SEO sitemap
├── src/
│   ├── app/                   # Next.js pages (App Router)
│   │   ├── api/               # API Routes
│   │   ├── auth/              # Authentication pages
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   ├── ui/                # Base UI components
│   │   └── ...                # Business components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and configuration
│   │   ├── events/            # Event Bus for reactive UI
│   │   ├── strategies/        # Propfirm strategies (Strategy Pattern)
│   │   └── ...                # Other utilities
│   └── types/                 # TypeScript types
├── scripts/                   # Utility scripts
├── .husky/                    # Git hooks
├── GITFLOW.md                 # GitFlow workflow documentation
├── API_README.md              # API documentation
└── README.md                  # This file
```

### Patterns and Architecture

- **Event-Driven UI**: Event Bus for reactive updates
- **Strategy Pattern**: Management of propfirm-specific rules
- **Factory Pattern**: Creation of strategy instances
- **Layered Architecture**: Repository / Service / Controller separation
- **Custom Hooks**: Encapsulation of reusable logic

## Testing

We use Jest and React Testing Library for unit testing.

```bash
# Run all tests
npm run test

# Watch mode (useful during development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Tests are organized by type:
- **UI Components**: `src/components/__tests__/`
- **Hooks**: `src/hooks/__tests__/`
- **Utilities**: `src/lib/__tests__/`

## Contributing

We welcome contributions! Please read our [GitFlow documentation](GITFLOW.md) for details on:
- Our GitFlow process
- Commit conventions (Conventional Commits)
- Code standards
- Pull Request process

### Quick Workflow

```bash
# Create a feature branch from develop
git checkout develop
git checkout -b feature/my-feature

# Make your changes and commit (Commitlint will validate the message)
git add .
git commit -m "feat(scope): short description"

# Push and create a Pull Request to develop
git push origin feature/my-feature
```

## Security

The application implements several security measures:

- **Hashed passwords** with bcrypt (12 rounds)
- **Secure cookies**: httpOnly, sameSite, secure in production
- **HTTP headers**: HSTS, X-Frame-Options, CSP, etc.
- **Input validation**: Zod for server-side validation
- **Secure JWT tokens** for authentication
- **CSRF protection** integrated with NextAuth.js

## Supported Propfirms

| Propfirm           | Evaluation Accounts | Funded Accounts | Specific Rules |
|-------------------|-------------------|-----------------|---------------|
| **TopStep**       | ✓                 | ✓              | 5-day cycles, 50% withdrawal |
| **TakeProfitTrader** | ✓              | ✓              | Buffer, 20% tax |
| **APEX**          | ✓                 | ✓              | Standard      |
| **FTMO**          | ✓                 | ✓              | Standard      |
| **MyFundedFutures** | ✓               | ✓              | Standard      |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Modern ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components

## Support

For questions or issues:
- Open an [issue](https://github.com/ByWizKi/scalper-propfirm/issues)
- Check the [API documentation](API_README.md)

Developed by the Scalper Propfirm team
