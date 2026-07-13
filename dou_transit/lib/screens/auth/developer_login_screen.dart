import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/auth_provider.dart';

/// Developer login screen — accessed by holding the logo on role selection for 5 seconds.
/// Developers log in with username and password (accounts created in Supabase by admin).
class DeveloperLoginScreen extends StatefulWidget {
  const DeveloperLoginScreen({super.key});

  @override
  State<DeveloperLoginScreen> createState() => _DeveloperLoginScreenState();
}

class _DeveloperLoginScreenState extends State<DeveloperLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final auth = context.read<AuthProvider>();
    final success = await auth.developerAccess(_usernameCtrl.text.trim(), _passwordCtrl.text);
    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, AppRoutes.developerMapping);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid developer credentials'), backgroundColor: DouTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: DouTheme.black,
      appBar: AppBar(
        backgroundColor: DouTheme.black,
        foregroundColor: DouTheme.white,
        title: const Text('Developer Access'),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.developer_mode, size: 64, color: DouTheme.white),
                const SizedBox(height: 24),
                const Text(
                  'Developer Console',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: DouTheme.white),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sign in with your developer account',
                  style: TextStyle(fontSize: 14, color: DouTheme.grey),
                ),
                const SizedBox(height: 32),

                TextFormField(
                  controller: _usernameCtrl,
                  validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  style: const TextStyle(color: DouTheme.white, fontSize: 16),
                  decoration: InputDecoration(
                    hintText: 'Username',
                    hintStyle: const TextStyle(color: DouTheme.grey),
                    prefixIcon: const Icon(Icons.person, color: DouTheme.grey),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: DouTheme.white, width: 2),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: DouTheme.white, width: 3),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _passwordCtrl,
                  validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  obscureText: _obscure,
                  style: const TextStyle(color: DouTheme.white, fontSize: 16),
                  decoration: InputDecoration(
                    hintText: 'Password',
                    hintStyle: const TextStyle(color: DouTheme.grey),
                    prefixIcon: const Icon(Icons.lock, color: DouTheme.grey),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off, color: DouTheme.grey),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: DouTheme.white, width: 2),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: DouTheme.white, width: 3),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: DouTheme.white,
                    foregroundColor: DouTheme.black,
                    minimumSize: const Size(double.infinity, 52),
                  ),
                  child: _isLoading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Access Console', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
