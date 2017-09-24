module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: 'Re-Hentai Sever',
      script: 'dist/server.js',
      env: {
        HOST: 'h.klarstrup.dk',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
    production: {
      interpreter: 'node@8.5.0',
      key: 'C:/Users/Klarstrup/.ssh/github_rsa',
      user: 'root',
      host: '46.101.225.235',
      ref: 'origin/master',
      repo: 'git@github.com:klarstrup/rehentai.git',
      path: '/var/www/h.klarstrup.dk',
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
      'post-deploy': 'yarn install --ignore-engines && yarn build && /root/.nvm/versions/node/v8.5.0/bin/pm2 reload ecosystem.config.js --env production',
    },
  },
};
