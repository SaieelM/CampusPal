import { ProfileForm } from '../components/ProfileForm';
import { Body, Screen, Title } from '../components/ui';

export default function ProfileSetup() {
  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 40 }}>
      <Title>Almost there!</Title>
      <Body muted style={{ marginBottom: 20 }}>
        Tell us your course and semester so we can show notes for your class.
      </Body>
      <ProfileForm submitLabel="Continue" />
    </Screen>
  );
}
