## Where to Travel: A Road Trip Resource

This repository contains source code for an application that allows road travelers to find destinations and attractions within a requested amount of driving time from their location.

### Run on a Development Server

```
cd where-to-travel
mvn package appengine:run
```
### Pre-commit
```
fail_fast: false
repos:
  - repo: https://github.com/prettier/prettier
    rev: ""
    hooks:
      - id: prettier
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v1.2.3
    hooks:
    -  id: trailing-whitespace
```
