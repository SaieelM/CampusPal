import { router } from 'expo-router';

import { ProfileForm } from '../components/ProfileForm';
import { Screen, toast } from '../components/ui';

export default function ProfileEdit() {
  return (
    <Screen edges={[]}>
      <ProfileForm
        submitLabel="Save"
        onDone={() => {
          toast('Profile updated');
          router.back();
        }}
      />
    </Screen>
  );
}
