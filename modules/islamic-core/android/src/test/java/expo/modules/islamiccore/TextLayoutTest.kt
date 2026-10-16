package expo.modules.islamiccore

import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.View
import android.widget.TextView
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsDefaults
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsForTests
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.text.ReactTextView
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import kotlin.math.ceil

@OptIn(UnstableReactNativeAPI::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TextLayoutTest {
  private lateinit var context: ThemedReactContext

  @Before fun setUp() {
    ReactNativeFeatureFlagsForTests.setUp()
    ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {
      override fun enableViewRecyclingForText() = true
    })
    val app = RuntimeEnvironment.getApplication()
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(app)
    context = ThemedReactContext(BridgeReactContext(app), app, "text-layout-test", -1)
  }

  @Test fun ordinaryAndSelectableTextUseTheMeasurementWrappingMode() {
    val pkg = TextLayoutPackage()
    for (name in listOf("RCTText", "RCTSelectableText")) {
      val manager = pkg.createViewManager(context.reactApplicationContext, name) as MatchingTextViewManager
      assertEquals(name, manager.name)
      assertFalse(manager.createViewInstance(context).getUseBoundsForWidth())
    }
    assertNull(pkg.createViewManager(context.reactApplicationContext, "RCTView"))
  }

  @Test fun recyclingCannotRestoreBoundsBasedWrapping() {
    val manager = MatchingTextViewManager("RCTText")
    val view = manager.createViewInstance(context)
    view.setUseBoundsForWidth(true)
    val recycled = manager.prepareToRecycleView(context, view)
    assertNotNull(recycled)
    assertFalse(recycled!!.getUseBoundsForWidth())
  }

  @Test fun preparedLayoutsKeepTheirExistingManagerWhileSelectableTextIsCorrected() {
    ReactNativeFeatureFlagsForTests.setUp()
    ReactNativeFeatureFlags.override(object : ReactNativeFeatureFlagsDefaults() {
      override fun enablePreparedTextLayout() = true
    })
    val pkg = TextLayoutPackage()
    assertNull(pkg.createViewManager(context.reactApplicationContext, "RCTText"))
    assertNotNull(pkg.createViewManager(context.reactApplicationContext, "RCTSelectableText"))
  }

  @Test @Config(sdk = [34]) fun olderAndroidKeepsTheFrameworkManagers() {
    val pkg = TextLayoutPackage()
    assertTrue(pkg.getViewManagerNames(context.reactApplicationContext).isEmpty())
    assertNull(pkg.createViewManager(context.reactApplicationContext, "RCTText"))
    assertNull(pkg.createViewManager(context.reactApplicationContext, "RCTSelectableText"))
  }

  @Test fun paintedLinesMatchMeasuredLinesForOverhangingAndArabicText() {
    val manager = MatchingTextViewManager("RCTText")
    for (family in listOf("cursive", "sans-serif")) {
      for (text in listOf("Enjoy your coffee f", "الفاتحة", "آل عمران", "الجمهور", "الحنفي", "١٠٠", "أذكار الصباح وأذكار المساء وأدعية بعد الصلاة")) {
        for (fontScale in listOf(1f, 1.45f, 2f)) {
          val view = manager.createViewInstance(context)
          val paint = TextPaint().apply { typeface = Typeface.create(family, Typeface.NORMAL); textSize = 18f * fontScale }
          for (width in listOf(ceil(Layout.getDesiredWidth(text, paint)).toInt(), 120)) {
            val measured = StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
              .setUseBoundsForWidth(false).setIncludePad(true).setBreakStrategy(Layout.BREAK_STRATEGY_SIMPLE).setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NONE).build()
            // TextView's platform layout is the actual draw path; use a plain TextView with
            // the corrected ReactTextView's mode to isolate line breaking from RN's span setup.
            val drawing = TextView(context).apply {
              setUseBoundsForWidth(view.getUseBoundsForWidth())
              typeface = paint.typeface
              setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, paint.textSize)
              includeFontPadding = true
              breakStrategy = Layout.BREAK_STRATEGY_SIMPLE
              hyphenationFrequency = Layout.HYPHENATION_FREQUENCY_NONE
              this.text = text
            }
            drawing.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            drawing.layout(0, 0, width, drawing.measuredHeight)
            assertEquals("$family / $text / $fontScale / $width", measured.lineCount, drawing.layout.lineCount)
            assertEquals(text.length, drawing.layout.getLineEnd(drawing.layout.lineCount - 1))
          }
        }
      }
    }
  }
}
