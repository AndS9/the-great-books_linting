packer {
  required_plugins {
    vagrant = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/vagrant"
    }
  }
}

source "vagrant" "base" {
  communicator = "ssh"
  source_path  = "ubuntu/jammy64"
  provider     = "virtualbox"
  output_dir   = "../builds/base"
  skip_add     = true
}

build {
  sources = ["source.vagrant.base"]

  provisioner "shell" {
    execute_command = "sudo -S sh -c '{{ .Vars }} {{ .Path }}'"
    script          = "scripts/provision_base.sh"
  }
}