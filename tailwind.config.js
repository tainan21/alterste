module.exports = {
  purge: {
    enabled: true,
    content: ['./src/**/*.html', './src/**/*.css']
  },
  theme: {
    extend: {}
  },
  variants: { backgroundColor: ['responsive', 'hover', 'focus', 'active'] },
  plugins: []
};
