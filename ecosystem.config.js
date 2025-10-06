module.exports = {
  apps: [
    {
      name: 'expense-backend',
      script: './backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './backend/logs/err.log',
      out_file: './backend/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      wait_ready: true,
      // Health check
      health_check: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        url: 'http://localhost:3000/api/health',
      },
    },
  ],
}
