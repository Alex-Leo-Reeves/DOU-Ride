import 'package:flutter_test/flutter_test.dart';
import 'package:dou_transit/main.dart';

void main() {
  testWidgets('App launches and shows role selection', (WidgetTester tester) async {
    await tester.pumpWidget(const DouTransitApp());
    expect(find.text('DOU'), findsOneWidget);
    expect(find.text('Welcome to DOU Transit'), findsOneWidget);
    expect(find.text('I am a Student'), findsOneWidget);
    expect(find.text('I am a Driver'), findsOneWidget);
  });
}
