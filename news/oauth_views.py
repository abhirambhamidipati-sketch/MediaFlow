import os
import requests
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'


def _verify_google_id_token(id_token: str) -> dict | None:
    """Verify a Google ID token via Google's tokeninfo endpoint. Returns claims or None."""
    try:
        resp = requests.get(GOOGLE_TOKENINFO_URL, params={'id_token': id_token}, timeout=5)
        if resp.status_code != 200:
            return None
        claims = resp.json()
        if 'error_description' in claims:
            return None

        # Validate audience matches configured client ID (if set)
        client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        if client_id and claims.get('aud') != client_id:
            return None

        return claims
    except Exception:
        return None


def _get_unique_username(base: str) -> str:
    username = base[:100]
    if not User.objects.filter(username=username).exists():
        return username
    counter = 1
    while User.objects.filter(username=f'{username}{counter}').exists():
        counter += 1
    return f'{username}{counter}'


class GoogleOAuthView(APIView):
    """
    POST /api/users/auth/google/
    Body: { "token": "<Google ID token>" }
    Returns: { "access": "...", "refresh": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get('token', '').strip()
        if not id_token:
            return Response({'error': 'Google ID token required.'}, status=status.HTTP_400_BAD_REQUEST)

        claims = _verify_google_id_token(id_token)
        if not claims:
            return Response({'error': 'Invalid or expired Google token.'}, status=status.HTTP_400_BAD_REQUEST)

        email = claims.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Google account has no email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Require verified email
        if claims.get('email_verified') not in (True, 'true'):
            return Response({'error': 'Google email address is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create user by email
        user = User.objects.filter(email=email).first()
        if not user:
            base_username = email.split('@')[0]
            username = _get_unique_username(base_username)
            user = User.objects.create(
                username=username,
                email=email,
                first_name=claims.get('given_name', ''),
                last_name=claims.get('family_name', ''),
            )
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
