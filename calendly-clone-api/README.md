# Calendly Clone API

A RESTful API for scheduling and managing appointments, built with Express.js and SQLite. This API allows users to manage events, schedules, and appointments, similar to Calendly.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [API Documentation](#api-documentation)
- [Why These API Stacks Exist](#why-these-api-stacks-exist)


## Features

- **User Management**: Create, update, and delete users.
- **Event Management**: Create, update, and delete event types.
- **Schedule Management**: Create, update, and delete user schedules.
- **Appointment Management**: Schedule, update, and delete appointments.
- **Authentication**: Secure endpoints with Bearer token authentication.
- **Swagger Documentation**: Interactive API documentation available at `/docs`.

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/EeroVallistu/CalendlyCloneAPI.git
   cd CalendlyCloneAPI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Seed the database with example data:
   ```bash
   node seed.js
   ```

5. Access the API at `http://localhost:3000`.

## API Documentation

The API is documented using Swagger. You can access the interactive documentation at: `http://localhost:3000/docs/`

## Why These API Stacks Exist

### 1. **Users API**
- **What it does**: Manages user accounts (create, update, delete).
- **Why it's needed**: To store user details and enable authentication.

### 2. **Authentication API**
- **What it does**: Handles login, logout, and session management.
- **Why it's needed**: To secure the system and ensure only authorized users can access it.

### 3. **Events API**
- **What it does**: Manages event types (e.g., meetings, calls).
- **Why it's needed**: To define the types of events users can schedule.

### 4. **Schedules API**
- **What it does**: Manages user availability.
- **Why it's needed**: To ensure appointments are only scheduled during free times.

### 5. **Appointments API**
- **What it does**: Manages the scheduling, updating, and deletion of appointments.
- **Why it's needed**: To handle the core functionality of booking appointments.