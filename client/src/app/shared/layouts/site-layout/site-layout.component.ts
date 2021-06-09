import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {AuthService} from '../../services/auth.service'
import {Router} from '@angular/router'
import {MaterialService} from '../../classes/material.service'

@Component({
  selector: 'app-site-layout',
  templateUrl: './site-layout.component.html',
  styleUrls: ['./site-layout.component.css']
})
export class SiteLayoutComponent implements AfterViewInit {

  @ViewChild('floating') floatingRef: ElementRef

  links = [
    {url: '/overview', name: 'Загальна'},
    {url: '/analytics', name: 'Аналітика та аналіз'},
    {url: '/history', name: 'Історія'},
    {url: '/post', name: 'Додати оголошення'},
    {url: '/categories', name: 'Категорії'}
  ]

  constructor(private auth: AuthService,
              private router: Router) {
  }

  ngAfterViewInit() {
    MaterialService.initializeFloatingButton(this.floatingRef)
  }

  logout(event: Event) {
    event.preventDefault()
    this.auth.logout()
  }

}
