# Contributing to AICD

Thank you for your interest in contributing to **AICD — Automated Industry Complex Designer**!
This document provides guidelines for collaboration.

## Quick Start

```bash
git clone https://github.com/<owner>/aicd.git
cd aicd
bun install
bun run dev
```

**Prerequisites:** [Bun](https://bun.sh/) (no Node.js needed)

## Development Scripts

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `bun run dev`     | Start dev server with HMR           |
| `bun run build`   | Type-check and build for production |
| `bun run preview` | Preview production build locally    |
| `bun run lint`    | Run ESLint                          |
| `bun run format`  | Format code with Prettier           |

## Coding Standards

### General

- **Language:** TypeScript strict mode, no `any` unless absolutely necessary
- **Style:** Prettier handles formatting — always run `bun run format` before committing
- **Naming:**
  - Components: PascalCase (e.g., `ProductionLine.vue`)
  - Composables: `use` prefix (e.g., `useRecipeSolver.ts`)
  - Utilities: camelCase
  - Constants: UPPER_SNAKE_CASE
- **File structure:**
  - `src/components/` — Vue SFC components
  - `src/composables/` — Vue composables
  - `src/utils/` — Pure utility functions
  - `src/types/` — TypeScript type definitions
  - `src/assets/` — Static assets (CSS, images)

### Vue Conventions

- Use `<script setup lang="ts">` for all components
- Use `defineProps<T>()` and `defineEmits<T>()` with type generics
- Keep component logic in composables when reusable
- One component per file

### CSS

- Use scoped styles (`<style scoped>`) by default
- Use CSS custom properties (variables) from `src/assets/main.css`
- Avoid inline styles

## Git Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Usage                                    |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Code style (formatting, no logic change) |
| `refactor` | Code restructuring, no behavior change   |
| `perf`     | Performance improvement                  |
| `test`     | Adding or updating tests                 |
| `build`    | Build system or dependencies             |
| `ci`       | CI/CD configuration                      |
| `chore`    | Maintenance tasks                        |
| `revert`   | Revert a previous commit                 |

### Examples

```
feat(solver): add linear programming solver for production lines
fix(ui): correct recipe card overflow on narrow screens
docs: update CONTRIBUTING with testing guidelines
refactor(types): extract Building interface to separate module
```

### Commit Message Rules

- Use **English** for commit messages
- Subject line: lowercase, imperative mood, no trailing period
- Subject line: 72 characters or fewer
- Body: wrap at 72 characters, explain **what** and **why** (not how)

## Before You Push

**Always run `bun run build` before pushing.** This is the same command CI runs
(`vue-tsc -b && vite build`). It is stricter than `vue-tsc --noEmit` — project
mode (`-b`) catches type errors that `--noEmit` misses. If it passes locally,
it will pass in CI.

```bash
# Quick check (type-only, less strict)
bun run lint

# Full verification — MUST pass before every push
bun run build
```

## Pull Request Process

1. **Fork** the repository and create your branch from `main`
2. **Branch naming:** `<type>/<short-description>` (e.g., `feat/recipe-solver`)
3. **Commits:** Squash or keep — as long as each commit follows the convention
4. **Lint & format:** Ensure `bun run lint` and `bun run format` pass
5. **Build:** Ensure `bun run build` succeeds with no errors
6. **Description:** Clearly describe the change and motivation in the PR
7. **Review:** At least one approval required before merge

## Issue Reporting

- Use GitHub Issues
- Include: expected behavior, actual behavior, steps to reproduce
- Add relevant labels (`bug`, `feature`, `question`, etc.)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
