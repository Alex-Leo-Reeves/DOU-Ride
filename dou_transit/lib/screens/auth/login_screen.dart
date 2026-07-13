import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/config/routes.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final success = await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text);

    if (success && mounted) {
      final role = auth.role;
      String? route;
      if (role == 'student') route = '/student/home';
      else if (role == 'driver') route = '/driver/home';
      else if (role == 'security') route = '/security/scanner';
      else if (role == 'admin') route = '/admin/dashboard';
      else if (role == 'vendor') route = '/vendor/home';

      if (route != null) Navigator.pushReplacementNamed(context, route);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid credentials. Please try again.'), backgroundColor: DouTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('Login')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              const Text("Welcome back", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text("Sign in to continue", style: TextStyle(fontSize: 16, color: DouTheme.grey)),
              const SizedBox(height: 48),

              TextFormField(
                controller: _emailCtrl,
                validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                decoration: const InputDecoration(
                  labelText: 'Email or Phone',
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
                    : const Text('Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 48),

              // Developer access
              GestureDetector(
                onLongPress: () => Navigator.pushNamed(context, AppRoutes.developerLogin),
                child: const Center(
                  child: Text('Login as Developer', style: TextStyle(fontSize: 13, color: DouTheme.grey)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
