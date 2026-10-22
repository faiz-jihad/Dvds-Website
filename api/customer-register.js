import { dbClient, endpoint, CheckoutError } from './_checkout.js';

export default endpoint(async (req) => {
  const db = dbClient();
  const { email, password, fullName, phone, address } = req.body || {};

  if (!email || typeof email !== 'string') {
    throw new CheckoutError('Please provide a valid email address.', 400);
  }
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new CheckoutError('Please provide a valid email address.', 400);
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new CheckoutError('Password must be at least 6 characters long.', 400);
  }

  const cleanName = (fullName && typeof fullName === 'string' ? fullName.trim() : '') || cleanEmail.split('@')[0];
  const cleanPhone = phone && typeof phone === 'string' ? phone.trim() : null;
  const cleanAddress = address && typeof address === 'string' ? address.trim() : null;

  // 1. Check if user already exists in auth.users (targeted lookup — no full list load)
  const { data: existingUserData } = await db.auth.admin.getUserByEmail(cleanEmail).catch(() => ({ data: { user: null } }));
  const existingUser = existingUserData?.user || null;

  let userId = null;

  if (existingUser) {
    // If user exists: check if they are already confirmed
    if (existingUser.email_confirmed_at) {
      throw new CheckoutError('An account with this email address already exists. Please sign in.', 409, 'ACCOUNT_EXISTS');
    }

    // If account was created unconfirmed (e.g. from previous failed attempt), confirm and update credentials
    const { data: updated, error: updateErr } = await db.auth.admin.updateUserById(existingUser.id, {
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
      },
    });

    if (updateErr) {
      throw new CheckoutError(updateErr.message || 'Could not update user account.', 400);
    }
    userId = updated.user.id;
  } else {
    // Create new user with email_confirm: true (avoids rate-limited verification emails and gives instant session)
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
      },
    });

    if (createErr) {
      throw new CheckoutError(createErr.message || 'Registration failed.', 400);
    }
    userId = created.user.id;
  }

  // 2. Upsert customer profile in profiles table
  const newProfile = {
    id: userId,
    email: cleanEmail,
    full_name: cleanName,
    phone: cleanPhone,
    role: 'customer',
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  const { error: profileErr } = await db.from('profiles').upsert(newProfile);
  if (profileErr) {
    console.warn('[customer-register] Profile upsert warning:', profileErr.message);
  }

  // 3. Save default shipping address if provided
  if (cleanAddress) {
    try {
      await db.from('addresses').insert({
        user_id: userId,
        label: 'Home',
        full_name: cleanName,
        line1: cleanAddress,
        line2: null,
        city: '',
        county: '',
        postcode: '',
        country: 'GB',
        phone: cleanPhone,
        is_default: true,
      });
    } catch (addrErr) {
      console.warn('[customer-register] Address insert warning:', addrErr);
    }
  }

  // 4. Send welcome email to customer (asynchronous, non-blocking)
  try {
    const { sendCustomerWelcomeEmail } = await import('./_email.js');
    await sendCustomerWelcomeEmail(db, {
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
    });
  } catch (err) {
    console.error('[customer-register] Welcome email dispatch note:', err.message);
  }

  return {
    success: true,
    userId,
    email: cleanEmail,
    fullName: cleanName,
  };
}, 'POST', { max: 20, windowMs: 60000 });
