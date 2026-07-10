# Contributing to FAILOI

We are excited that you want to contribute to FAILOI! Please review the guidelines below to ensure a smooth development and review process.

---

## 🛠️ Local Development Setup

1. **Fork the Repository** on GitHub.
2. **Clone your Fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/failoi.git
   ```
3. Set up the backend and frontend development environments as documented in the [README.md](README.md) file.
4. Create a local feature branch:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```

---

## 📐 Coding Guidelines

* **Linting**: Ensure all frontend code passes ESLint rules cleanly. Run the check using `npm run lint` inside the `/frontend` directory before staging.
* **Type Safety**: Avoid using loose `any` casts when possible. Ensure all Prisma client calls match the database schemas.
* **Keep Code Clean**: Remove all commented out debugging snippets and unneeded logs prior to making commits.

---

## 📥 Pull Request Checklist

Before submitting a Pull Request, ensure that:

1. The project compiles successfully on both backend (`npm run build`) and frontend (`npm run build`).
2. There are no active TypeScript compilation errors.
3. You have documented your changes inside the PR description.
4. Your commits are clean and follow standard semantic naming conventions.
