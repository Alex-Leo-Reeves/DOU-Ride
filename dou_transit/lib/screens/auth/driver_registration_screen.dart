import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:dou_transit/config/theme.dart';
import 'package:dou_transit/providers/auth_provider.dart';

class DriverRegistrationScreen extends StatefulWidget {
  const DriverRegistrationScreen({super.key});

  @override
  State<DriverRegistrationScreen> createState() => _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState extends State<DriverRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _kekeRegCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  int _maxSeats = 3;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  String? _facePhotoPath;

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _kekeRegCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    // TODO: Use image_picker to take face photo
    // final picked = await ImagePicker().pickImage(source: ImageSource.camera);
    setState(() => _facePhotoPath = '/mock/face_photo.jpg');
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_facePhotoPath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please take a face photo')),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.registerDriver({
      'fullName': _fullNameCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim(),
      'kekeRegistration': _kekeRegCtrl.text.trim(),
      'maxSeats': _maxSeats,
      'facePhotoBase64': 'mock_base64_photo',
      'password': _passwordCtrl.text,
    });

    if (success && mounted) {
      Navigator.pushReplacementNamed(context, '/driver/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: DouTheme.white,
      appBar: AppBar(title: const Text('Driver Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Face photo
              GestureDetector(
                onTap: _takePhoto,
                child: Container(
                  height: 160,
                  decoration: BoxDecoration(
                    color: _facePhotoPath != null ? DouTheme.black : DouTheme.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: DouTheme.black, width: 2),
                  ),
                  child: Center(
                    child: _facePhotoPath != null
                        ? const Icon(Icons.check_circle, color: DouTheme.white, size: 48)
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.camera_alt, size: 40, color: DouTheme.black),
                              SizedBox(height: 8),
                              Text('Tap to take face photo',
                                  style: TextStyle(fontSize: 14, color: DouTheme.grey)),
                            ],
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              TextFormField(
                controller: _fullNameCtrl,
                validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person, size: 20),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _phoneCtrl,
                validator: (v) {
                  if (v?.isEmpty ?? true) return 'Required';
                  if (v!.length < 11) return 'Invalid phone';
                  return null;
                },
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone, size: 20),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _kekeRegCtrl,
                validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                decoration: const InputDecoration(
                  labelText: 'Keke Registration Number',
                  prefixIcon: Icon(Icons.confirmation_number, size: 20),
                ),
              ),
              const SizedBox(height: 16),

              DropdownButtonFormField<int>(
                initialValue: _maxSeats,
                decoration: const InputDecoration(
                  labelText: 'Max Seats',
                  prefixIcon: Icon(Icons.event_seat, size: 20),
                ),
                items: [3, 4, 5, 6].map((s) => DropdownMenuItem(value: s, child: Text('$s seats'))).toList(),
                onChanged: (v) => setState(() => _maxSeats = v ?? 3),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _passwordCtrl,
                validator: (v) {
                  if (v?.isEmpty ?? true) return 'Required';
                  if (v!.length < 6) return 'At least 6 characters';
                  return null;
                },
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off, size: 20),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _confirmCtrl,
                validator: (v) => v != _passwordCtrl.text ? 'Passwords do not match' : null,
                obscureText: _obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirm Password',
                  prefixIcon: const Icon(Icons.lock, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirm ? Icons.visibility : Icons.visibility_off, size: 20),
                    onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: auth.isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                child: auth.isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: DouTheme.white, strokeWidth: 2))
                    : const Text('Register as Driver', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Already registered? Login', style: TextStyle(color: DouTheme.grey)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
