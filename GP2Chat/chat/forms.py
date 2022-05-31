from django import forms
from django.contrib.auth.forms import UserCreationForm
from chat.models import CustomUser


class UserCreateForm(UserCreationForm):
    password1 = forms.CharField(label='Enter password', 
                                widget=forms.PasswordInput)
    password2 = forms.CharField(label='Confirm password', 
                                widget=forms.PasswordInput)
    class Meta:
        model=CustomUser
        fields=("username","email","first_name",
                "last_name","password1","password2")
        help_texts = {
            "username":None,
        }