import XCTest
final class SmokeTests: XCTestCase {
 override func setUpWithError() throws { continueAfterFailure=false }
 func testDiagnosticAndBenchmark(){let app=XCUIApplication();app.launch();let button=app.webViews.buttons["Executar benchmark"];XCTAssertTrue(button.waitForExistence(timeout:20));button.tap();XCTAssertTrue(app.webViews.staticTexts["Teste concluído."].waitForExistence(timeout:20));app.webViews.buttons["Ver relatório"].tap();XCTAssertTrue(app.webViews.buttons["Fechar"].waitForExistence(timeout:5))}
}
