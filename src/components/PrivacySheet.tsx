import { Pressable } from './Pressable';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../text-size';
import { bilingual, isRTL, localizeCopy, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';

const copy = {
  en: {
    title: 'Privacy', overview: 'No account, advertising or analytics. Qibla and prayer calculations run on your device.',
    location: 'Location and compass',
    locationBody: 'Your chosen coordinates, location source, label, accuracy and update time are saved on this device. Device location is reused for six hours and refreshed only in the foreground with permission. There is no background location tracking. Compass readings are used while Qibla is visible; they are not saved or uploaded.',
    storage: 'Saved on your device',
    storageBody: 'Settings, reading copies, bookmarks, reciter choices, downloaded audio and tafsir are stored in app-private storage. Device backup services may include app data, depending on your system settings.',
    network: 'Optional internet services',
    networkBody: 'Audio streaming and downloads contact EveryAyah. Tafsir downloads contact the source listed in Credits and, for mirrored editions, GitHub. These services can receive your IP address and requested content. The optional OpenStreetMap map receives tile requests revealing your IP address and viewed area. Coordinates are not uploaded for prayer or Qibla calculations. Links open external websites.',
    notifications: 'Prayer alerts and reminders',
    notificationsBody: 'Prayer alerts and devotional reminders are scheduled locally through your phone’s notification system. Permission is requested when you enable them. Their times and sound choices are saved on this device. The operating system controls delivery, sound and lock-screen visibility.',
    remove: 'Manage or remove data',
    removeBody: 'Remove saved audio and tafsir in Settings. To erase all saved app data, use your phone’s app-storage controls or uninstall the app. Manage system backups and location/notification permissions in your phone’s settings.',
  },
  ar: {
    title: 'الخصوصية', overview: 'لا حسابات ولا إعلانات ولا تحليلات استخدام. تُحسب القبلة ومواقيت الصلاة على جهازك.',
    location: 'الموقع والبوصلة',
    locationBody: 'تُحفظ الإحداثيات المختارة ومصدر الموقع واسمه ودقته ووقت تحديثه على هذا الجهاز. يُعاد استخدام موقع الجهاز لست ساعات، ويُحدّث أثناء استخدام التطبيق فقط وبإذن الموقع. لا يوجد تتبع للموقع في الخلفية. تُستخدم قراءات البوصلة أثناء ظهور صفحة القبلة، ولا تُحفظ ولا تُرسل.',
    storage: 'البيانات المحفوظة على جهازك',
    storageBody: 'تُحفظ الإعدادات ونسخ القراءة والإشارات المرجعية وخيارات القارئ والتلاوات والتفاسير المنزّلة في مساحة التطبيق الخاصة. قد تشمل النسخ الاحتياطية للجهاز بيانات التطبيق حسب إعدادات النظام.',
    network: 'خدمات الإنترنت الاختيارية',
    networkBody: 'يتصل الاستماع والتنزيل بـEveryAyah. تتصل تنزيلات التفسير بالمصدر المذكور في المصادر وحقوق النشر، وبـGitHub للنسخ المستضافة هناك. قد تستقبل هذه الخدمات عنوان IP والمحتوى المطلوب. تستقبل خريطة OpenStreetMap الاختيارية طلبات الصور التي تكشف عنوان IP والمنطقة المعروضة. لا تُرسل الإحداثيات لحساب المواقيت أو القبلة. تفتح الروابط مواقع خارجية.',
    notifications: 'تنبيهات الصلاة والتذكيرات',
    notificationsBody: 'تُجدول تنبيهات الصلاة والأذكار محليًا عبر نظام تنبيهات الهاتف. يُطلب الإذن عند تفعيلها، وتُحفظ أوقاتها وخيارات صوتها على هذا الجهاز. يتحكم نظام التشغيل في وصولها وصوتها وظهورها على شاشة القفل.',
    remove: 'إدارة البيانات أو حذفها',
    removeBody: 'احذف التلاوات والتفاسير المحفوظة من الإعدادات. لحذف جميع بيانات التطبيق، استخدم خيارات تخزين التطبيق في هاتفك أو أزل التطبيق. أدر النسخ الاحتياطية وأذونات الموقع والتنبيهات من إعدادات الهاتف.',
  },
};

export function PrivacySheet({ language, visible, onClose }: {language: Language; visible: boolean; onClose: () => void}) {
  const { styles, colors } = useReaderStyles(baseStyles), insets = useSafeAreaInsets(), rtl = isRTL(language);
  const c = localizeCopy(language, copy);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View accessibilityViewIsModal style={[styles.screen, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text accessibilityRole="header" style={styles.title}>{c.title}</Text>
        <Pressable testID="privacy-close" accessibilityRole="button" accessibilityLabel={bilingual(language, 'إغلاق', 'Close')} onPress={onClose} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.accent} />
        </Pressable>
      </View>
      <ScrollView testID="privacy-details" contentContainerStyle={styles.content}>
        <Text style={[styles.body, rtl && styles.rtl]}>{c.overview}</Text>
        {(['location', 'storage', 'network', 'notifications', 'remove'] as const).map(key => <View key={key} style={styles.section}>
          <Text accessibilityRole="header" style={[styles.heading, rtl && styles.rtl]}>{c[key]}</Text>
          <Text style={[styles.body, rtl && styles.rtl]}>{c[`${key}Body`]}</Text>
        </View>)}
      </ScrollView>
    </View>
  </Modal>;
}
const baseStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#0B211D'}, header: {minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {color: '#F4EFE4', fontSize: 22, fontWeight: '600'}, close: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'},
  content: {width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 24}, section: {gap: 8},
  heading: {color: '#D6BA7A', fontSize: 18, fontWeight: '600'}, body: {color: '#A8C1B8', fontSize: 15, lineHeight: 25},
  reverse: {flexDirection: 'row-reverse'}, rtl: {textAlign: 'right', writingDirection: 'rtl'},
});
