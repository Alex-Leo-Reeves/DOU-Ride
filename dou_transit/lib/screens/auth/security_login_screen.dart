import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Security login screen — only login, no account creation.
/// Security accounts are created by admin in Supabase.
class SecurityLoginScreen extends StatefulWidget {
  const SecurityLoginScreen({super.key});

  @override
  State<SecurityLoginScreen> createState() => _SecurityLoginScreenState();
}

class _SecurityLoginScreenState extends State<SecurityLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    // Security gate: login with username (email) + password
    final success = await auth.login(_usernameCtrl.text.trim(), _passwordCtrl.text);

    if (success && mounted) {
      if (auth.role == 'security') {
        Navigator.pushReplacementNamed(context, '/security/scanner');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Access denied. Security account required.'), backgroundColor: DouTheme.error),
        );
        auth.logout();
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid credentials'), backgroundColor: DouTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(
        title: const Text('Security Login'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: DouTheme.black,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.security, color: DouTheme.white, size: 40),
              ),
              const SizedBox(height: 24),
              const Text(
                'Security Gate Access',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Only authorized security personnel can log in.',
                style: TextStyle(fontSize: 14, color: DouTheme.grey),
              ),
              const SizedBox(height: 48),

              TextFormField(
                controller: _usernameCtrl,
                validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  prefixIcon: Icon(Icons.person, size: 20),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _passwordCtrl,
                validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off, size: 20),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: auth.isLoading ? null : _login,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: auth.isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: DouTheme.white, strokeWidth: 2))
                    : const Text('Login as Security', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),

              const SizedBox(height: 32),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back', style: TextStyle(color: DouTheme.grey)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
