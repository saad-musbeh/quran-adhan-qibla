package expo.modules.islamiccore

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QuranTitleIndexTest {
  private val queue = listOf("file://ayah-0", "file://ayah-1", "file://ayah-2")
  private val titles = listOf("Al-Fatihah · 1", "Al-Fatihah · 2", "Al-Fatihah · 3")

  @Test fun writesAtTheIndexOwnedByTheCurrentItemUri() {
    val updated = QuranTitleIndex.updatingAtCurrentUri(
      titles,
      queue,
      currentUri = "file://ayah-2",
      title = "Al-Fatihah · 3 (playing)",
    )
    assertEquals(listOf("Al-Fatihah · 1", "Al-Fatihah · 2", "Al-Fatihah · 3 (playing)"), updated)
  }

  @Test fun rebuildThenImmediateUpdateIsIgnoredWhenUrisNoLongerMatch() {
    // The native queue was rebuilt to different URIs but JS has not published
    // matching titles yet; a stale positional write would corrupt the table.
    val rebuiltQueue = listOf("https://new-0", "https://new-1")
    assertNull(QuranTitleIndex.updatingAtCurrentUri(titles, rebuiltQueue, "https://new-1", "T"))
  }

  @Test fun sizeMismatchAfterRebuildIsIgnoredRatherThanPadded() {
    assertNull(
      QuranTitleIndex.updatingAtCurrentUri(titles, queue + "file://ayah-3", "file://ayah-1", "T")
    )
    assertNull(
      QuranTitleIndex.updatingAtCurrentUri(titles, queue.dropLast(1), "file://ayah-1", "T")
    )
  }

  @Test fun missingCurrentItemOrUnknownUriIsIgnored() {
    assertNull(QuranTitleIndex.updatingAtCurrentUri(titles, queue, null, "T"))
    assertNull(QuranTitleIndex.updatingAtCurrentUri(titles, queue, "file://absent", "T"))
  }

  @Test fun reorderedQueueFollowsUriIdentityNotTheStaleIndex() {
    val reorderedQueue = listOf("file://ayah-2", "file://ayah-0", "file://ayah-1")
    val reorderedTitles = listOf("Al-Fatihah · 3", "Al-Fatihah · 1", "Al-Fatihah · 2")
    val updated = QuranTitleIndex.updatingAtCurrentUri(
      reorderedTitles,
      reorderedQueue,
      currentUri = "file://ayah-0",
      title = "Al-Fatihah · 1 (playing)",
    )
    assertEquals(listOf("Al-Fatihah · 3", "Al-Fatihah · 1 (playing)", "Al-Fatihah · 2"), updated)
  }
}
