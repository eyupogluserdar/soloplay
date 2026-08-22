export const colors = {
  background: '#121212', // Deep dark for premium feel
  surface: '#1E1E1E',    // Cards and players
  surfaceLight: '#2C2C2C',
  surfaceHighlight: '#3D3D3D',
  primary: '#00FF9D',    // Neon Emerald Green for accents (Premium Dark)
  primaryVariant: '#00CC7E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#333333',
  error: '#FF5252'
};

export const typography = {
  header: { fontSize: 24, fontWeight: 'bold' as const, color: colors.text },
  title: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  signature: { fontSize: 12, fontStyle: 'italic' as const, color: colors.primary },
  h1: { fontSize: 28, fontWeight: 'bold' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 12, color: colors.textSecondary }
};

