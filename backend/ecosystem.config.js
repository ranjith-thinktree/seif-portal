module.exports = {
  apps: [
    {
      name: 'seif-backend',
      script: './src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
    },
  ],
};
