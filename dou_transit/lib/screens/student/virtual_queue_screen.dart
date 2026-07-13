import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/config/api_config.dart';
import 'package:dou_transit/providers/queue_provider.dart';
import 'package:dou_transit/providers/ride_provider.dart';

/// Virtual Queue screen — ticket number, position, ETA, waiting animation.
class VirtualQueueScreen extends StatefulWidget {
  const VirtualQueueScreen({super.key});

  @override
  State<VirtualQueueScreen> createState() => _VirtualQueueScreenState();
}

class _VirtualQueueScreenState extends State<VirtualQueueScreen> {
  Timer? _positionTimer;

  @override
  void initState() {
    super.initState();
    // Poll position every 15 seconds
    _positionTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => context.read<QueueProvider>().getPosition(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<QueueProvider>().getPosition();
    });
  }

  @override
  void dispose() {
    _positionTimer?.cancel();
    super.dispose();
  }

  String _formatWaitTime(int minutes) {
    if (minutes < 1) return 'Less than 1 min';
    if (minutes < 60) return '$minutes min';
    return '${minutes ~/ 60}h ${minutes % 60}m';
  }

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<QueueProvider>();

    // If queue was called, navigate to called screen
    if (queue.isCalled) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, AppRoutes.studentQueueCalled);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Virtual Queue'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            queue.leaveQueue();
            Navigator.pop(context);
          },
        ),
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: queue.isWaiting
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Large ticket number
                      Text(
                        '#${queue.ticketNumber ?? '--'}',
                        style: const TextStyle(fontSize: 80, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        queue.destinationName ?? '',
                        style: const TextStyle(fontSize: 18, color: DouTheme.grey),
                      ),
                      const SizedBox(height: 48),

                      // Position & wait info
                      DouCard(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _StatItem(
                                  label: 'Ahead',
                                  value: '${queue.studentsAhead}',
                                  icon: Icons.people_outline,
                                ),
                                Container(width: 1, height: 40, color: DouTheme.black),
                                _StatItem(
                                  label: 'Wait',
                                  value: _formatWaitTime(queue.estimatedWaitMinutes),
                                  icon: Icons.timer_outlined,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Waiting animation
                      const SizedBox(
                        width: 60,
                        height: 60,
                        child: CircularProgressIndicator(color: DouTheme.black, strokeWidth: 3),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Waiting for your turn...',
                        style: TextStyle(fontSize: 16, color: DouTheme.grey),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'You\'ll be notified when it\'s time to board.',
                        style: TextStyle(fontSize: 13, color: DouTheme.grey.withOpacity(0.7)),
                      ),
                      const SizedBox(height: 32),

                      // Leave queue
                      TextButton.icon(
                        onPressed: () {
                          queue.leaveQueue();
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.exit_to_app, color: DouTheme.error),
                        label: const Text(
                          'Leave Queue',
                          style: TextStyle(color: DouTheme.error),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.info_outline, size: 48, color: DouTheme.grey),
                      const SizedBox(height: 16),
                      const Text('No active queue'),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Back to Home'),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 28, color: DouTheme.black),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: DouTheme.grey),
        ),
      ],
    );
  }
}

/// Queue Called screen — neon flash, driver info, 120s countdown, boarding PIN.
class QueueCalledScreen extends StatefulWidget {
  const QueueCalledScreen({super.key});

  @override
  State<QueueCalledScreen> createState() => _QueueCalledScreenState();
}

class _QueueCalledScreenState extends State<QueueCalledScreen> with WidgetsBindingObserver {
  Timer? _countdownTimer;
  int _secondsRemaining = ApiConfig.queueCallTimeoutSeconds;
  bool _hasBoarded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startCountdown();
    // Vibrate / flash effect handled by platform channels in production
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining <= 0) {
        timer.cancel();
        _handleNoShow();
        return;
      }
      setState(() => _secondsRemaining--);
    });
  }

  void _handleNoShow() {
    if (!mounted) return;
    context.read<RideProvider>().reportNoShow(
      context.read<RideProvider>().currentTripId ?? '',
      context.read<RideProvider>().boardingPin ?? '',
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No-show penalty applied (₦50)')),
    );
  }

  Future<void> _showBoardDialog() async {
    final pinCtrl = TextEditingController();

    final pin = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: DouTheme.white,
        title: const Text('Enter Boarding PIN'),
        content: TextField(
          controller: pinCtrl,
          keyboardType: TextInputType.number,
          maxLength: 4,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 8),
          decoration: const InputDecoration(
            counterText: '',
            hintText: '0000',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, pinCtrl.text),
            child: const Text('Verify'),
          ),
        ],
      ),
    );

    if (pin != null && mounted) {
      final success = await context.read<RideProvider>().boardRide(
        context.read<RideProvider>().currentTripId ?? '',
        pin,
      );
      if (success) {
        setState(() => _hasBoarded = true);
        context.read<QueueProvider>().setBoarding();
        _countdownTimer?.cancel();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid PIN. Try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final seconds = _secondsRemaining;
    final isUrgent = seconds <= 30;

    return Scaffold(
      backgroundColor: _hasBoarded ? DouTheme.success : (isUrgent ? DouTheme.error : DouTheme.black),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: _hasBoarded
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle, size: 80, color: DouTheme.white),
                      const SizedBox(height: 24),
                      const Text(
                        'Boarding Confirmed!',
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: DouTheme.white),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Your driver will take you to your destination.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 16, color: DouTheme.white),
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton(
                        onPressed: () => Navigator.pushReplacementNamed(context, AppRoutes.studentHome),
                        style: ElevatedButton.styleFrom(backgroundColor: DouTheme.white, foregroundColor: DouTheme.black),
                        child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Neon flash effect (background color alternates)
                      AnimatedOpacity(
                        opacity: isUrgent ? 1.0 : 0.8,
                        duration: const Duration(milliseconds: 500),
                        child: const Icon(Icons.flash_on, size: 72, color: DouTheme.neon),
                      ),
                      const SizedBox(height: 24),

                      const Text(
                        'YOUR RIDE IS READY!',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: DouTheme.white,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 8),

                      Text(
                        'Keke Fleet #42',
                        style: TextStyle(fontSize: 18, color: DouTheme.white.withOpacity(0.8)),
                      ),
                      const SizedBox(height: 32),

                      // Big countdown
                      Text(
                        seconds.toString().padLeft(2, '0'),
                        style: TextStyle(
                          fontSize: 72,
                          fontWeight: FontWeight.bold,
                          color: isUrgent ? DouTheme.neon : DouTheme.white,
                        ),
                      ),
                      const Text(
                        'seconds to board',
                        style: TextStyle(fontSize: 14, color: DouTheme.white),
                      ),
                      const SizedBox(height: 32),

                      // Boarding PIN display
                      DouCard(
                        padding: const EdgeInsets.all(16),
                        child: Consumer<RideProvider>(
                          builder: (_, ride, __) => Column(
                            children: [
                              const Text('Your Boarding PIN', style: TextStyle(fontSize: 12, color: DouTheme.grey)),
                              const SizedBox(height: 4),
                              Text(
                                ride.boardingPin ?? '----',
                                style: const TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 8,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text('Show this to the driver', style: TextStyle(fontSize: 12, color: DouTheme.grey)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Board button
                      ElevatedButton.icon(
                        onPressed: _showBoardDialog,
                        icon: const Icon(Icons.check, color: DouTheme.white),
                        label: const Text(
                          'I HAVE BOARDED',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isUrgent ? DouTheme.error : DouTheme.black,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Emergency
                      TextButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.warning, color: DouTheme.warning),
                        label: const Text('Can\'t find the Keke?', style: TextStyle(color: DouTheme.warning)),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
