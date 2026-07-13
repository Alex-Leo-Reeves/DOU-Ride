import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/services/api_service.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Bottom sheet for security guards to report a driver with offense tags.
class ReportDriverSheet extends StatefulWidget {
  final String targetId;
  final String targetName;

  const ReportDriverSheet({
    super.key,
    required this.targetId,
    required this.targetName,
  });

  static Future<void> show(BuildContext context, {
    required String targetId,
    required String targetName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ReportDriverSheet(
        targetId: targetId,
        targetName: targetName,
      ),
    );
  }

  @override
  State<ReportDriverSheet> createState() => _ReportDriverSheetState();
}

class _ReportDriverSheetState extends State<ReportDriverSheet> {
  String? _selectedIncidentType;
  final _descriptionCtrl = TextEditingController();
  bool _isSubmitting = false;
  bool _submitted = false;

  static const List<Map<String, dynamic>> _incidentTypes = [
    {'type': 'overloading', 'label': 'Overloading', 'icon': Icons.people_outline},
    {'type': 'reckless_driving', 'label': 'Reckless Driving', 'icon': Icons.speed},
    {'type': 'damaged_vehicle', 'label': 'Damaged Vehicle', 'icon': Icons.build_outlined},
    {'type': 'unruly_behavior', 'label': 'Unruly Behavior', 'icon': Icons.mood_bad},
    {'type': 'no_ticket', 'label': 'No Ticket / Fare', 'icon': Icons.confirmation_number},
    {'type': 'refused_pin', 'label': 'Refused Boarding PIN', 'icon': Icons.pin},
    {'type': 'verbal_abuse', 'label': 'Verbal Abuse', 'icon': Icons.warning_amber},
    {'type': 'queue_jumping', 'label': 'Queue Jumping', 'icon': Icons.format_list_numbered},
  ];

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedIncidentType == null) return;

    setState(() => _isSubmitting = true);

    final auth = context.read<AuthProvider>();
    final result = await ApiService.post(
      '/api/reports/create',
      body: {
        'targetId': widget.targetId,
        'targetRole': 'driver',
        'incidentType': _selectedIncidentType,
        'description': _descriptionCtrl.text.trim().isNotEmpty
            ? _descriptionCtrl.text.trim()
            : null,
      },
      token: auth.token,
    );

    if (mounted) {
      setState(() {
        _isSubmitting = false;
        _submitted = !result.containsKey('error');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: DouTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: _submitted
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 24),
                  const Icon(Icons.check_circle, size: 60, color: DouTheme.success),
                  const SizedBox(height: 16),
                  const Text(
                    'Report Submitted',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Report filed against ${widget.targetName}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: DouTheme.grey),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('OK'),
                  ),
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle
                  Center(child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: DouTheme.grey, borderRadius: BorderRadius.circular(2)),
                  )),
                  const SizedBox(height: 16),

                  const Text(
                    'Report Driver',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Reporting: ${widget.targetName}',
                    style: const TextStyle(color: DouTheme.grey, fontSize: 14),
                  ),
                  const SizedBox(height: 16),

                  // Incident type chips
                  const Text('Offense Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _incidentTypes.map((incident) {
                      final selected = _selectedIncidentType == incident['type'];
                      return ActionChip(
                        avatar: Icon(
                          incident['icon'] as IconData,
                          size: 16,
                          color: selected ? DouTheme.white : DouTheme.black,
                        ),
                        label: Text(incident['label'] as String),
                        onPressed: () => setState(() => _selectedIncidentType = incident['type'] as String),
                        backgroundColor: selected ? DouTheme.black : DouTheme.lightGrey,
                        labelStyle: TextStyle(
                          color: selected ? DouTheme.white : DouTheme.black,
                          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Description (optional)
                  TextField(
                    controller: _descriptionCtrl,
                    maxLines: 2,
                    maxLength: 200,
                    decoration: const InputDecoration(
                      labelText: 'Additional details (optional)',
                      hintText: 'Describe what happened...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Submit
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: (_selectedIncidentType == null || _isSubmitting)
                          ? null
                          : _submit,
                      icon: _isSubmitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: DouTheme.white))
                          : const Icon(Icons.warning),
                      label: const Text('SUBMIT REPORT', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
