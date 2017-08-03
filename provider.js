module.exports = {
  name: 'default',
  paths: {
    root: __dirname,
  },
  plugins: [
    {
      name: 'base',
      paths: {
        root: __dirname,
        server: 'lib',
        cli: 'lib/cli',
      },
    },
  ],
};
