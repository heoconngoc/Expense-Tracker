module.exports = {
  apps: [
    {
      name: "expense-tracker",
      script: "src/server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_PATH: "/var/lib/expense-tracker/expense.db",
        BACKUP_DIR: "/var/lib/expense-tracker/backups",
      },
    },
  ],
};
