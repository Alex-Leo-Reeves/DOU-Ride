import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/auth_provider.dart';
import 'package:dou_transit/screens/auth/portal_verification_screen.dart';

class StudentRegistrationScreen extends StatefulWidget {
  const StudentRegistrationScreen({super.key});

  @override
  State<StudentRegistrationScreen> createState() => _StudentRegistrationScreenState();
}

class _StudentRegistrationScreenState extends State<StudentRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _matricCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  final _deptCtrl = TextEditingController();
  final _facultyCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _portalVerified = false;

  @override
  void dispose() {
    _matricCtrl.dispose();
    _fullNameCtrl.dispose();
    _deptCtrl.dispose();
    _facultyCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _openPortal() async {
    final result = await Navigator.push<PortalScrapeResult>(
      context,
      MaterialPageRoute(builder: (_) => const PortalVerificationScreen()),
    );

    if (result != null) {
      setState(() {
        _matricCtrl.text = result.matricNumber;
        _fullNameCtrl.text = result.fullName;
        _deptCtrl.text = result.department;
        _facultyCtrl.text = result.faculty;
        if (result.email.isNotEmpty) {
          _emailCtrl.text = result.email;
        }
        _portalVerified = true;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.registerStudent({
      'matricNumber': _matricCtrl.text.trim(),
      'fullName': _fullNameCtrl.text.trim(),
      'department': _deptCtrl.text.trim(),
      'faculty': _facultyCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'email': _emailCtrl.text.trim(),
      'password': _passwordCtrl.text,
    });

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, '/student/home');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration failed. Please try again.'),
          backgroundColor: DouTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('Student Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Portal verification card
              GestureDetector(
                onTap: _openPortal,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _portalVerified ? DouTheme.success.withAlpha(25) : DouTheme.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _portalVerified ? DouTheme.success : DouTheme.black,
                      width: 2,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _portalVerified ? Icons.check_circle : Icons.school,
                        color: _portalVerified ? DouTheme.success : DouTheme.black,
                        size: 24,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _portalVerified
                                  ? 'Portal Verified!'
                                  : 'Verify via DOU Portal',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              _portalVerified
                                  ? 'Details auto-filled from portal'
                                  : 'Tap to log into the DOU portal & auto-fill details',
                              style: const TextStyle(fontSize: 12, color: DouTheme.grey),
                            ),
                          ],
                        ),
                      ),
                      if (!_portalVerified)
                        const Icon(Icons.chevron_right, color: DouTheme.black),
                      if (_portalVerified)
                        IconButton(
                          icon: const Icon(Icons.refresh, size: 18),
                          onPressed: _openPortal,
                          tooltip: 'Re-verify',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              _buildField(_matricCtrl, 'Matric Number', Icons.badge, (v) {
                if (v?.isEmpty ?? true) return 'Required';
                return null;
              }),
              const SizedBox(height: 16),
              _buildField(_fullNameCtrl, 'Full Name', Icons.person, (v) {
                if (v?.isEmpty ?? true) return 'Required';
                return null;
              }),
              const SizedBox(height: 16),
              _buildField(_deptCtrl, 'Department', Icons.school, null),
              const SizedBox(height: 16),
              _buildField(_facultyCtrl, 'Faculty', Icons.account_balance, null),
              const SizedBox(height: 16),
              _buildField(_phoneCtrl, 'Phone Number', Icons.phone, (v) {
                if (v?.isEmpty ?? true) return 'Required';
                if (v!.length < 11) return 'Invalid phone number';
                return null;
              }, keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              _buildField(_emailCtrl, 'Email', Icons.email, (v) {
                if (v?.isEmpty ?? true) return 'Required';
                if (!v!.contains('@')) return 'Invalid email';
                return null;
              }, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              _buildPasswordField(_passwordCtrl, 'Password', true, (v) {
                if (v?.isEmpty ?? true) return 'Required';
                if (v!.length < 6) return 'At least 6 characters';
                return null;
              }),
              const SizedBox(height: 16),
              _buildPasswordField(_confirmCtrl, 'Confirm Password', false, (v) {
                if (v != _passwordCtrl.text) return 'Passwords do not match';
                return null;
              }),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: auth.isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: auth.isLoading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(color: DouTheme.white, strokeWidth: 2),
                      )
                    : const Text('Register', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),

              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Already have an account? Login',
                    style: TextStyle(color: DouTheme.grey)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController ctrl, String label, IconData icon, String? Function(String?)? validator, {TextInputType? keyboardType}) {
    return TextFormField(
      controller: ctrl,
      validator: validator,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
      ),
    );
  }

  Widget _buildPasswordField(TextEditingController ctrl, String label, bool isPassword, String? Function(String?)? validator) {
    return TextFormField(
      controller: ctrl,
      validator: validator,
      obscureText: isPassword ? _obscurePassword : _obscureConfirm,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock, size: 20),
        suffixIcon: IconButton(
          icon: Icon(
            isPassword
                ? (_obscurePassword ? Icons.visibility : Icons.visibility_off)
                : (_obscureConfirm ? Icons.visibility : Icons.visibility_off),
            size: 20,
          ),
          onPressed: () => setState(() {
            if (isPassword) _obscurePassword = !_obscurePassword;
            else _obscureConfirm = !_obscureConfirm;
          }),
        ),
      ),
    );
  }
}
