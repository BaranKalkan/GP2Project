from django.db import models

# Create your models here.
from django.db import models
     
from django.contrib.auth.models import AbstractUser, PermissionsMixin, BaseUserManager

class CustomUserManager(BaseUserManager):
    def create_superuser(self, email, username, password, **other_fields):
        other_fields.setdefault('is_staff', True)
        other_fields.setdefault('is_superuser', True)
        other_fields.setdefault('is_active', True)

        if other_fields.get('is_staff') is not True:
            raise ValueError(
                'Superuser must be assigned to is_staff=True.')
        if other_fields.get('is_superuser') is not True:
            raise ValueError(
                'Superuser must be assigned to is_superuser=True.')

        return self.create_user(email, username, password, **other_fields)

    def create_user(self, email, user_name, password, **other_fields):
        
        if not email:
            raise ValueError('You must provide an email address')

        email = self.normalize_email(email)
        user = self.model(email=email, username=user_name, **other_fields)
        user.set_password(password)
        user.save()
        return user


class CustomUser(AbstractUser, PermissionsMixin):
    friends = models.ManyToManyField("CustomUser", blank=True)
    online = models.IntegerField("online", blank=False, default=0, null=False)
    objects = CustomUserManager()


class Friend_Request(models.Model):
    from_user = models.ForeignKey(CustomUser,related_name='from_user',on_delete=models.CASCADE)
    to_user = models.ForeignKey(CustomUser,related_name='to_user',on_delete=models.CASCADE)
    