import { StyleSheet, View } from 'react-native';
import { bilingual, isRTL, type Language } from '../i18n';
import { useReaderTheme } from '../quran-theme-context';
import { Text } from '../text-size';
import { Pressable } from './Pressable';

export function SavedDataError({ language, onRetry }: { language: Language; onRetry: () => void }) {
  const { theme } = useReaderTheme();
  return <View style={styles.notice}>
    <Text accessibilityRole="alert" style={{ color: theme.appText, textAlign: isRTL(language) ? 'right' : 'left' }}>
      {bilingual(language, 'تعذر إكمال العملية. حاول مجددًا.', 'Could not complete the operation. Try again.')}
    </Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
      <Text style={{ color: theme.accent }}>{bilingual(language, 'إعادة المحاولة', 'Retry')}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({ notice: { gap: 4 }, retry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' } });
