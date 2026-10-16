package expo.modules.islamiccore

import android.os.Build
import com.facebook.react.ReactPackage
import com.facebook.react.ViewManagerOnDemandReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.text.ReactTextViewManager

/**
 * Backport the line-breaking correction in react-native#58280 to RN 0.86.3.
 * Register before MainReactPackage so all native Text (including selectable Text) uses it.
 * The inherited manager retains React Native's spans, selection, accessibility and props.
 */
@OptIn(UnstableReactNativeAPI::class)
class TextLayoutPackage : ReactPackage, ViewManagerOnDemandReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()

  override fun getViewManagerNames(reactContext: ReactApplicationContext): Collection<String> {
    if (Build.VERSION.SDK_INT < 35) return emptyList()
    return if (ReactNativeFeatureFlags.enablePreparedTextLayout()) listOf(SELECTABLE_TEXT)
      else listOf(ReactTextViewManager.REACT_CLASS, SELECTABLE_TEXT)
  }

  override fun createViewManager(reactContext: ReactApplicationContext, viewManagerName: String): ViewManager<*, *>? =
    if (viewManagerName in getViewManagerNames(reactContext)) MatchingTextViewManager(viewManagerName) else null

  companion object {
    const val SELECTABLE_TEXT = "RCTSelectableText"
  }
}

@OptIn(UnstableReactNativeAPI::class)
internal class MatchingTextViewManager(private val componentName: String) : ReactTextViewManager() {
  override fun getName(): String = componentName

  override fun createViewInstance(context: ThemedReactContext): ReactTextView =
    super.createViewInstance(context).also(::matchLineBreaking)

  public override fun prepareToRecycleView(reactContext: ThemedReactContext, view: ReactTextView): ReactTextView? =
    super.prepareToRecycleView(reactContext, view)?.also(::matchLineBreaking)

  private fun matchLineBreaking(view: ReactTextView) {
    // Android 15+ defaults TextView to glyph-bounds wrapping, but RN measures advances.
    // Matching those paths prevents trailing words from wrapping into an unmeasured line.
    if (Build.VERSION.SDK_INT >= 35) view.setUseBoundsForWidth(false)
  }
}
