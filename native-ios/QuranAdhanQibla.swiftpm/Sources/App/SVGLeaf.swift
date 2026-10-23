import SwiftUI
import UIKit
import WebKit

private struct SVGPageHitmap: Decodable {
  let viewBox: [Double]
  let verses: [SVGHitVerse]

  struct SVGHitVerse: Decodable {
    let surah: Int
    let verse: Int
    let subpaths: [[[Double]]]
    var key: String { "\(surah):\(verse)" }
  }
}

@MainActor private final class SVGScrollView: UIScrollView {
  var onLayout: (() -> Void)?
  override func layoutSubviews() {
    super.layoutSubviews()
    onLayout?()
  }
}

/// Displays the bundled vector page in an isolated, script-disabled WebKit view.
/// Verse selection and highlighting stay native and use the page's existing hitmap.
struct SVGLeaf: UIViewRepresentable {
  let url: URL
  let hitmapURL: URL
  let pageNumber: Int
  let scale: Double
  let highlightedKey: String?
  let onTurn: (Int) -> Void
  let onZoom: (Double) -> Void
  let onVerse: (String?) -> Void

  func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

  func makeUIView(context: Context) -> UIScrollView {
    let scroll = SVGScrollView()
    scroll.accessibilityIdentifier = "quran.reader.page.\(context.coordinator.parent.pageNumber)"
    scroll.backgroundColor = .clear
    scroll.isOpaque = false
    scroll.clipsToBounds = true
    scroll.bouncesZoom = true
    scroll.minimumZoomScale = 1
    scroll.maximumZoomScale = 6
    scroll.delegate = context.coordinator
    scroll.showsHorizontalScrollIndicator = false
    scroll.showsVerticalScrollIndicator = false
    scroll.contentInsetAdjustmentBehavior = .never

    let content = UIView()
    content.backgroundColor = .clear
    content.isOpaque = false
    let webConfiguration = WKWebViewConfiguration()
    webConfiguration.websiteDataStore = .nonPersistent()
    webConfiguration.preferences.javaScriptCanOpenWindowsAutomatically = false
    if #available(iOS 14.0, *) {
      webConfiguration.defaultWebpagePreferences.allowsContentJavaScript = false
    } else {
      webConfiguration.preferences.javaScriptEnabled = false
    }
    let web = WKWebView(frame: .zero, configuration: webConfiguration)
    web.isOpaque = false
    web.backgroundColor = .clear
    web.scrollView.isScrollEnabled = false
    web.scrollView.backgroundColor = .clear
    web.navigationDelegate = context.coordinator
    content.addSubview(web)

    let highlight = CAShapeLayer()
    highlight.fillColor = UIColor.systemYellow.withAlphaComponent(0.3).cgColor
    highlight.strokeColor = UIColor.clear.cgColor
    content.layer.addSublayer(highlight)

    let failure = UILabel()
    failure.text = "تعذر عرض الصفحة\nUnable to display this page"
    failure.textAlignment = .center
    failure.numberOfLines = 0
    failure.textColor = .secondaryLabel
    failure.font = .systemFont(ofSize: 16, weight: .medium)
    failure.isHidden = true
    content.addSubview(failure)

    scroll.addSubview(content)
    context.coordinator.scroll = scroll
    context.coordinator.content = content
    context.coordinator.webView = web
    context.coordinator.highlightLayer = highlight
    context.coordinator.failureLabel = failure
    scroll.onLayout = { [weak coordinator = context.coordinator] in coordinator?.layoutPage() }
    context.coordinator.installGestures(on: scroll)
    context.coordinator.loadPageIfNeeded()
    return scroll
  }

  func updateUIView(_ scroll: UIScrollView, context: Context) {
    let coordinator = context.coordinator
    coordinator.parent = self
    scroll.accessibilityIdentifier = "quran.reader.page.\(pageNumber)"
    coordinator.loadPageIfNeeded()
    coordinator.layoutPage()
    coordinator.updateHighlight()
    coordinator.applyRequestedScale()
  }

  @MainActor
  final class Coordinator: NSObject, UIScrollViewDelegate, UIGestureRecognizerDelegate,
    WKNavigationDelegate
  {
    var parent: SVGLeaf
    weak var scroll: UIScrollView?
    weak var content: UIView?
    weak var webView: WKWebView?
    weak var highlightLayer: CAShapeLayer?
    weak var failureLabel: UILabel?
    private var hitmap: SVGPageHitmap?
    private var activeNavigation: WKNavigation?
    private var isLayingOut = false
    private var requestedURL: URL?
    private var highlightedKey: String?
    private var requestedScale: Double?
    private var isProgrammaticZoom = false
    private var viewBox = CGRect.zero
    private var baseSize = CGSize.zero
    private static var maps: [String: SVGPageHitmap]?

    init(parent: SVGLeaf) { self.parent = parent }

    func installGestures(on scroll: UIScrollView) {
      let longPress = UILongPressGestureRecognizer(target: self, action: #selector(longPressed(_:)))
      longPress.delegate = self
      scroll.addGestureRecognizer(longPress)
      for direction: UISwipeGestureRecognizer.Direction in [.up, .down, .left, .right] {
        let swipe = UISwipeGestureRecognizer(target: self, action: #selector(swiped(_:)))
        swipe.direction = direction
        swipe.delegate = self
        scroll.addGestureRecognizer(swipe)
      }
    }

    func loadPageIfNeeded() {
      guard requestedURL != parent.url else { return }
      requestedURL = parent.url
      failureLabel?.isHidden = true
      webView?.isHidden = true
      webView?.accessibilityIdentifier = "quran.page.loading.\(parent.pageNumber)"
      activeNavigation = nil
      webView?.stopLoading()
      loadHitmap()
      do {
        let data = try CompactPageData.decode(contentsOf: parent.url)
        guard let source = String(data: data, encoding: .utf8),
          let svgStart = source.range(of: "<svg", options: .caseInsensitive)
        else { throw CocoaError(.fileReadCorruptFile) }
        let svg = String(source[svgStart.lowerBound...])
        let document = """
          <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;-webkit-user-select:none;-webkit-touch-callout:none}body{display:flex;align-items:center;justify-content:center}svg{display:block;width:100%;height:100%;max-width:100%;max-height:100%;overflow:hidden}</style></head><body>\(svg)</body></html>
          """
        activeNavigation = webView?.loadHTMLString(document, baseURL: nil)
      } catch {
        showFailure()
      }
    }

    func loadHitmap() {
      if Self.maps == nil, let data = try? Data(contentsOf: parent.hitmapURL) {
        Self.maps = try? JSONDecoder().decode([String: SVGPageHitmap].self, from: data)
      }
      hitmap = Self.maps?[String(parent.pageNumber)]
      if let values = hitmap?.viewBox, values.count == 4,
        values.allSatisfy({ $0.isFinite }), values[2] > 0, values[3] > 0
      {
        viewBox = CGRect(x: values[0], y: values[1], width: values[2], height: values[3])
      } else {
        viewBox = .zero
      }
      highlightedKey = nil
      highlightLayer?.path = nil
    }

    func layoutPage() {
      guard !isLayingOut, let scroll, let content else { return }
      isLayingOut = true
      defer { isLayingOut = false }
      // `contentInset` is used below only to center a page smaller than the viewport;
      // it must not reduce the available size on subsequent layout passes.
      let bounds = scroll.bounds
      guard bounds.width > 0, bounds.height > 0 else { return }
      let aspect =
        viewBox.width > 0 && viewBox.height > 0
        ? viewBox.width / viewBox.height : 0.72
      let width = min(bounds.width, bounds.height * aspect)
      let height = width / aspect
      let newSize = CGSize(width: width, height: height)
      guard
        abs(newSize.width - baseSize.width) > 0.5
          || abs(newSize.height - baseSize.height) > 0.5
      else {
        centerContent()
        return
      }
      let oldRatio = scroll.zoomScale
      isProgrammaticZoom = true
      scroll.setZoomScale(1, animated: false)
      baseSize = newSize
      content.frame = CGRect(origin: .zero, size: newSize)
      webView?.frame = content.bounds
      failureLabel?.frame = content.bounds.insetBy(dx: 16, dy: 16)
      highlightLayer?.frame = content.bounds
      scroll.contentSize = newSize
      scroll.contentInset = .zero
      scroll.minimumZoomScale = 1
      scroll.maximumZoomScale = 6
      scroll.setZoomScale(min(6, max(1, oldRatio)), animated: false)
      isProgrammaticZoom = false
      centerContent()
      renderHighlight()
    }

    func centerContent() {
      guard let scroll else { return }
      let insetX = max(0, (scroll.bounds.width - scroll.contentSize.width) / 2)
      let insetY = max(0, (scroll.bounds.height - scroll.contentSize.height) / 2)
      let inset = UIEdgeInsets(top: insetY, left: insetX, bottom: insetY, right: insetX)
      if scroll.contentInset != inset { scroll.contentInset = inset }
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { content }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
      centerContent()
      guard !isProgrammaticZoom else { return }
      let value = Double(scrollView.zoomScale)
      guard value.isFinite else { return }
      let clamped = min(6, max(1, value))
      DispatchQueue.main.async { [weak self, weak scrollView] in
        guard let self, let scrollView,
          abs(Double(scrollView.zoomScale) - clamped) < 0.02,
          abs(self.parent.scale - clamped) > 0.02
        else { return }
        self.parent.onZoom(clamped)
      }
    }

    func applyRequestedScale() {
      guard let scroll, baseSize.width > 0 else { return }
      let desired = CGFloat(min(6, max(1, parent.scale)))
      if requestedScale == nil || abs((requestedScale ?? 1) - Double(desired)) > 0.02 {
        requestedScale = Double(desired)
        if abs(scroll.zoomScale - desired) > 0.02 {
          isProgrammaticZoom = true
          scroll.setZoomScale(desired, animated: false)
          isProgrammaticZoom = false
          centerContent()
        }
      }
    }

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
      if gestureRecognizer is UISwipeGestureRecognizer, let scroll {
        return scroll.zoomScale <= 1.05
      }
      return true
    }

    func gestureRecognizer(
      _ gestureRecognizer: UIGestureRecognizer,
      shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool { true }

    @objc func swiped(_ gesture: UISwipeGestureRecognizer) {
      parent.onTurn(gesture.direction == .up || gesture.direction == .right ? 1 : -1)
    }

    @objc func longPressed(_ gesture: UILongPressGestureRecognizer) {
      guard gesture.state == .began, let scroll, let content, let hitmap,
        viewBox.width > 0, viewBox.height > 0
      else { return }
      let point = scroll.convert(gesture.location(in: scroll), to: content)
      let source = CGPoint(
        x: viewBox.minX + point.x / content.bounds.width * viewBox.width,
        y: viewBox.minY + point.y / content.bounds.height * viewBox.height)
      for verse in hitmap.verses {
        for points in verse.subpaths {
          let path = polygon(points)
          if path.contains(source) {
            parent.onVerse(verse.key)
            return
          }
        }
      }
      parent.onVerse(nil)
    }

    func updateHighlight() {
      guard highlightedKey != parent.highlightedKey else { return }
      renderHighlight()
    }

    private func renderHighlight() {
      guard let layer = highlightLayer else { return }
      highlightedKey = parent.highlightedKey
      let path = CGMutablePath()
      if let key = highlightedKey, let verse = hitmap?.verses.first(where: { $0.key == key }) {
        for points in verse.subpaths {
          let mapped = points.compactMap { point -> CGPoint? in
            guard point.count == 2 else { return nil }
            return CGPoint(
              x: (point[0] - viewBox.minX) / viewBox.width * baseSize.width,
              y: (point[1] - viewBox.minY) / viewBox.height * baseSize.height)
          }
          guard mapped.count >= 3 else { continue }
          path.move(to: mapped[0])
          for point in mapped.dropFirst() { path.addLine(to: point) }
          path.closeSubpath()
        }
      }
      layer.path = path
    }

    private func polygon(_ points: [[Double]]) -> CGPath {
      let path = CGMutablePath()
      let valid = points.compactMap { point -> CGPoint? in
        guard point.count == 2, point[0].isFinite, point[1].isFinite else { return nil }
        return CGPoint(x: point[0], y: point[1])
      }
      guard let first = valid.first else { return path }
      path.move(to: first)
      for point in valid.dropFirst() { path.addLine(to: point) }
      path.closeSubpath()
      return path
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      guard let activeNavigation, navigation === activeNavigation else { return }
      webView.isHidden = false
      webView.accessibilityIdentifier = "quran.page.ready.\(parent.pageNumber)"
      failureLabel?.isHidden = true
    }

    func webView(
      _ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error
    ) {
      guard let activeNavigation, navigation === activeNavigation else { return }
      showFailure()
    }

    func webView(
      _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
      withError error: Error
    ) {
      guard let activeNavigation, navigation === activeNavigation else { return }
      showFailure()
    }

    func webView(
      _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
      decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
      let destination = navigationAction.request.url?.absoluteString
      let isMainFrame = navigationAction.targetFrame?.isMainFrame == true
      decisionHandler(
        isMainFrame && (destination == nil || destination == "about:blank") ? .allow : .cancel)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
      guard let activeNavigation, navigation === activeNavigation else { return }
      showFailure()
    }

    private func showFailure() {
      activeNavigation = nil
      webView?.isHidden = true
      webView?.accessibilityIdentifier = "quran.page.failed.\(parent.pageNumber)"
      failureLabel?.isHidden = false
    }
  }
}
