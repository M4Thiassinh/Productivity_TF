module.exports = {
  apps: [{
    name: 'productivity-app',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Reinicia automáticamente si falla
    max_restarts: 10,
    min_uptime: '10s',
    // Auto-reinicia a las 2 AM diariamente si quieres
    cron_restart: '0 2 * * *'
  }]
};
