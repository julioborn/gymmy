//
//  MainViewController.swift
//  App
//
//  Capacitor 8 solo auto-registra plugins que vienen de un paquete npm
//  (listados en capacitor.config.json). Los plugins custom que viven sueltos
//  en este target (LiveActivity, KeepAwake, AppIcon, en AppDelegate.swift)
//  hay que registrarlos a mano aca, el unico punto de extension pensado
//  para esto en CAPBridgeViewController.
//

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
        bridge?.registerPluginInstance(KeepAwakePlugin())
        bridge?.registerPluginInstance(AppIconPlugin())
    }
}
