import nextVitals from 'eslint-config-next/core-web-vitals';

// C4-TRACE: retain the Next Core Web Vitals preset using its native flat config.
const eslintConfig = [...nextVitals];

export default eslintConfig;
