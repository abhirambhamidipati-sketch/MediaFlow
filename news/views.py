from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from .models import ImageUpload

def home(request):
    images = ImageUpload.objects.all()
    return render(request, 'home.html', {'images': images})

from django.urls import path
from .views import home

urlpatterns = [
    path('', home, name='home'),
]