import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/admin_provider.dart';

/// Student directory with search, suspend, and wallet info
class StudentDirectoryScreen extends StatefulWidget {
  const StudentDirectoryScreen({super.key});

  @override
  State<StudentDirectoryScreen> createState() => _StudentDirectoryScreenState();
}

class _StudentDirectoryScreenState extends State<StudentDirectoryScreen> {
  final _searchCtrl = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().fetchStudents();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filtered(List<Map<String, dynamic>> students) {
    if (_searchQuery.isEmpty) return students;
    return students.where((s) {
      final name = (s['fullName'] as String? ?? '').toLowerCase();
      final matric = (s['matricNumber'] as String? ?? '').toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || matric.contains(query);
    }).toList();
  }

  Future<void> _suspendStudent(Map<String, dynamic> student) async {
    final reasonCtrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Suspend Student'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Suspend ${student['fullName']} (${student['matricNumber']})'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              decoration: const InputDecoration(labelText: 'Suspension reason'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, reasonCtrl.text.trim()),
            style: ElevatedButton.styleFrom(backgroundColor: DouTheme.error),
            child: const Text('SUSPEND', style: TextStyle(color: DouTheme.white)),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && mounted) {
      final success = await context.read<AdminProvider>().suspendStudent(
        student['id'] as String,
        result,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(success ? 'Student suspended' : 'Failed to suspend'),
          backgroundColor: success ? DouTheme.success : DouTheme.error,
        ));
      }
    }
  }

  Future<void> _unsuspendStudent(String userId) async {
    final admin = context.read<AdminProvider>();
    final success = await admin.unsuspendUser(userId);
    if (success) {
      await admin.fetchStudents();
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Student unsuspended' : 'Failed to unsuspend'),
        backgroundColor: success ? DouTheme.success : DouTheme.error,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final filtered = _filtered(admin.students);

    return Scaffold(
      appBar: AppBar(title: const Text('Student Directory')),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                labelText: 'Search by name or matric',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),

          if (admin.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(admin.error!, style: const TextStyle(color: DouTheme.error)),
            ),

          // List
          Expanded(
            child: admin.isLoading
                ? const Center(child: CircularProgressIndicator(color: DouTheme.black))
                : filtered.isEmpty
                    ? const Center(child: Text('No students found', style: TextStyle(color: DouTheme.grey)))
                    : RefreshIndicator(
                        onRefresh: () => admin.fetchStudents(),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final s = filtered[i];
                            final isSuspended = s['isSuspended'] as bool? ?? false;
                            final name = s['fullName'] as String? ?? '';
                            final matric = s['matricNumber'] as String? ?? '';
                            final dept = s['department'] as String? ?? '';
                            final balance = (s['walletBalance'] as num?)?.toDouble() ?? 0.0;

                            return Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                            if (isSuspended) ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: DouTheme.error.withOpacity(0.1),
                                                  borderRadius: BorderRadius.circular(4),
                                                  border: Border.all(color: DouTheme.error),
                                                ),
                                                child: const Text('SUSPENDED', style: TextStyle(fontSize: 8, color: DouTheme.error, fontWeight: FontWeight.bold)),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(matric, style: const TextStyle(fontSize: 13, color: DouTheme.grey)),
                                        Text('$dept — ₦${balance.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: DouTheme.grey)),
                                      ],
                                    ),
                                  ),
                                  if (!isSuspended)
                                    IconButton(
                                      icon: const Icon(Icons.block, color: DouTheme.error, size: 20),
                                      onPressed: () => _suspendStudent(s),
                                      tooltip: 'Suspend',
                                    ),
                                  if (isSuspended)
                                    IconButton(
                                      icon: const Icon(Icons.check_circle, color: DouTheme.success, size: 20),
                                      onPressed: () => _unsuspendStudent(s['id'] as String),
                                      tooltip: 'Unsuspend',
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
