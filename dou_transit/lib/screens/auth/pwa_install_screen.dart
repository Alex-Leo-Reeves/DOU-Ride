import 'package:flutter/material.dart';

/// "Add to Home Screen" guidance screen for iOS Safari users.
///
/// This screen appears only once for iOS users who haven't added
/// the PWA to their home screen yet. It shows clear step-by-step
/// instructions with a visual guide.
class PwaInstallScreen extends StatefulWidget {
  const PwaInstallScreen({super.key});

  @override
  State<PwaInstallScreen> createState() => _PwaInstallScreenState();
}

class _PwaInstallScreenState extends State<PwaInstallScreen> {
  int _currentStep = 0;
  bool _dontShowAgain = false;

  final List<_StepData> _steps = const [
    _StepData(
      icon: Icons.share,
      title: 'Step 1',
      description: 'Tap the Share button at the bottom of Safari',
      detail: 'Look for the square icon with an upward arrow at the center bottom of your screen.',
    ),
    _StepData(
      icon: Icons.add_box_outlined,
      title: 'Step 2',
      description: 'Scroll down and tap "Add to Home Screen"',
      detail: 'In the share menu, scroll past the app icons until you see "Add to Home Screen".',
    ),
    _StepData(
      icon: Icons.edit_outlined,
      title: 'Step 3',
      description: 'Confirm the name and tap "Add"',
      detail: 'You can keep the name as "DOU Transit" or customize it. Then tap "Add" in the top right corner.',
    ),
    _StepData(
      icon: Icons.check_circle_outline,
      title: 'Done! ✓',
      description: 'DOU Transit is now on your home screen',
      detail: 'The app works like a native app now with push notifications, offline support, and full screen mode.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Install DOU Transit',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Header illustration
            Container(
              margin: const EdgeInsets.symmetric(vertical: 24),
              padding: const EdgeInsets.all(20),
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: Colors.black, width: 2),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      offset: Offset(4, 4),
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    'DOU',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),

            // Step content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    // Step icon
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.black, width: 2),
                      ),
                      child: Icon(
                        _steps[_currentStep].icon,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Step title
                    Text(
                      _steps[_currentStep].title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Step description
                    Text(
                      _steps[_currentStep].description,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Step detail
                    Text(
                      _steps[_currentStep].detail,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        color: Colors.grey,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Step indicator dots
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _steps.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: index == _currentStep ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: index == _currentStep ? Colors.black : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),

            // Don't show again checkbox
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 4),
              child: Row(
                children: [
                  SizedBox(
                    height: 24,
                    width: 24,
                    child: Checkbox(
                      value: _dontShowAgain,
                      onChanged: (v) => setState(() => _dontShowAgain = v ?? false),
                      activeColor: Colors.black,
                      side: const BorderSide(color: Colors.black, width: 2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () => setState(() => _dontShowAgain = !_dontShowAgain),
                    child: const Text(
                      "Don't show this again",
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Bottom buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 24),
              child: Row(
                children: [
                  // Back / Skip button
                  if (_currentStep > 0)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _currentStep--),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.black,
                          side: const BorderSide(color: Colors.black, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Back',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 12),

                  // Next / Done button
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        if (_currentStep < _steps.length - 1) {
                          setState(() => _currentStep++);
                        } else {
                          Navigator.of(context).pop(true);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        elevation: 4,
                        shadowColor: Colors.black38,
                      ),
                      child: Text(
                        _currentStep < _steps.length - 1 ? 'Next' : 'Got it!',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepData {
  final IconData icon;
  final String title;
  final String description;
  final String detail;

  const _StepData({
    required this.icon,
    required this.title,
    required this.description,
    required this.detail,
  });
}
