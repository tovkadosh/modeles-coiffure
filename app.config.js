// Pour la mise en ligne sur GitHub Pages, le site vit dans un sous-dossier (BASE_URL=/nom-du-depot).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments ?? {}), baseUrl: process.env.BASE_URL || '' },
});
