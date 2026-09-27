import ExpoModulesCore
import QuickLook
import UIKit

// Holds one local file for the system Quick Look controller.
private class UnoqrPreviewDataSource: NSObject, QLPreviewControllerDataSource {
  let fileURL: NSURL

  init(fileURL: NSURL) {
    self.fileURL = fileURL
  }

  func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    return 1
  }

  func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
    return fileURL
  }
}

// Presents a downloaded file using iOS's native Quick Look preview.
public class UnoqrFileOpenerModule: Module {
  private var previewController: QLPreviewController?
  private var previewDataSource: UnoqrPreviewDataSource?

  public func definition() -> ModuleDefinition {
    Name("UnoqrFileOpener")

    AsyncFunction("openFile") { (uri: String, promise: Promise) in
      guard let fileURL = URL(string: uri), fileURL.isFileURL,
            FileManager.default.fileExists(atPath: fileURL.path) else {
        promise.reject("FILE_NOT_FOUND", "The downloaded file is unavailable.")
        return
      }

      guard QLPreviewController.canPreview(fileURL as NSURL) else {
        promise.reject("UNSUPPORTED_PREVIEW", "This file has no iOS preview.")
        return
      }

      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("NO_VIEW_CONTROLLER", "The file preview cannot be opened right now.")
        return
      }

      let source = UnoqrPreviewDataSource(fileURL: fileURL as NSURL)
      let controller = QLPreviewController()
      controller.dataSource = source
      self.previewDataSource = source
      self.previewController = controller

      presenter.present(controller, animated: true) {
        promise.resolve()
      }
    }.runOnQueue(.main)
  }
}
