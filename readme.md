
# 🧠 Backend

This is the **backend** for your node projects, built using **Node.js** and **TypeScript**. It follows a modular architecture with clear separations for controllers, helpers, routes, middleware, and more.

---

## 🚀 Features

- Organized folder structure with modules and core logic separation
- TypeScript-based for type safety
- Middleware support (authentication included)
- Environment-based configuration
- Extensible architecture for admin, auth, PDF, Excel, and more

---

## 📁 Folder Structure
```

src/
├── assets/ # Static assets (images, uploads)
│ ├── images/
│ └── uploads/
├── constants/ # Global constants (e.g., static.ts)
├── core/ # Core framework-like code
│ ├── controller/
│ ├── helper/
│ ├── models/
│ ├── routes/
│ └── server/
├── enums/ # Custom enums
├── environment/ # Environment configuration
├── middleware/ # Custom middleware (e.g., authentication.ts)
├── modules/ # Feature-based modules
│ ├── admin/
│ ├── app/
│ ├── auth/
│ ├── excel/
│ └── pdf/
└── types/ # Type declarations (e.g., schema.d.ts)

````

---

## 🛠️ Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd server
````

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Update `src/environment/environment.ts` with appropriate values.

### 4. Start the server

```bash
npm run dev
```

> Make sure `ts-node` and `nodemon` are configured in your `package.json` scripts.

---

## 🧱 Scripts (package.json)

```json
"scripts": {
   "test": "echo \"Error: no test specified\" && exit 1",
      "dev": "concurrently \"tsc -w\" \"nodemon index.js\"",
      "start-server": "node server.js",
      "tsc": "tsc -w"
}
```

---

## 🔐 Authentication

JWT-based authentication middleware is located in `src/middleware/authentication.ts`.

---

## 📦 Module System

Each module (`admin`, `auth`, `app`, `excel`, `pdf`) contains:

- `controller/` - Business logic
- `helper/` - Utility functions
- `routes/` - Express routes
- (Optional) `config/` and `templates/`

---

## 📘 TypeScript Config

Ensure your `tsconfig.json` is properly configured. Example:

```json
{
    "compilerOptions": {
      "target": "ES6",
      "module": "commonjs",
      "esModuleInterop": true,
      "moduleResolution": "node",
      "forceConsistentCasingInFileNames": true,
      "strict": true,
      "skipLibCheck": true
    },
    "include": ["**/*.ts"]
  }
```

---

## 📄 License

This project is licensed under [MIT License](LICENSE).

---

## 👨‍💻 Author

- **Mukarram**  
  Passionate backend developer | Loves clean code | Building scalable systems.
