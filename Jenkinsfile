#!groovy
node('windows && nodejs') {
  stage('Checkout') {
    checkout scm
  }

  stage('Install Dependencies') {
    try {
      bat 'npm install'
    } catch (err) {
      teams_failure('Failed installing dependencies')
      throw err
    }
  }

  dir('argos-sdk') {
    stage('Building argos-sdk') {
      dir('deploy') {
        deleteDir()
      }

      dir('.grunt') {
        deleteDir()
      }

      try {
        bat 'npm run lint'
        bat 'build\\release.cmd'
        bat 'npm run test'
      } catch (err) {
        teams_failure('Failed building argos-sdk')
        throw err
      }
      
      dir('deploy') {
        stash includes: '**/*.*', name: 'sdk'
      }
    }
  }

  dir('products/argos-saleslogix') {
    stage('Building argos-saleslogix') {
      dir('deploy') {
        deleteDir()
      }

      dir('.grunt') {
        deleteDir()
      }

      try {
        bat 'npm run lint'
        bat 'build\\release.cmd'
        bat 'npm run test'
      } catch (err) {
        teams_failure('Failed building argos-saleslogix')
        throw err
      }

      dir('deploy') {
        stash includes: '**/*.*', name: 'slx'
      }

      stage('Creating bundles') {
        try {
          bat 'grunt bundle'
          bat 'grunt lang-pack'

          dir('deploy') {
            stage('Copying bundles') {
              bat """robocopy . \\\\usdavwtldata.testlogix.com\\devbuilds\\builds\\mobile\\bundles\\%BRANCH_NAME%\\%BUILD_NUMBER%\\ *.zip /r:3 /w:5
                  IF %ERRORLEVEL% LEQ 1 EXIT /B 0"""
            }
          }
        } catch (err) {
          teams_failure('Failed building bundles.')
          throw err
        }
      }
    }
  }
}

stage('Copying to IIS') {
  node('slx82') {
    iiscopy(env.BRANCH_NAME, env.BUILD_NUMBER)
  }
}

stage('Sending Teams notification') {
  node {
    teams_success('Mobile built successfully')
  }
}

void iiscopy(branch, build) {
  dir("C:\\inetpub\\wwwroot\\mobile-builds\\$branch\\$build") {
    unstash 'slx'
    unstash 'sdk'
  }
  bat """%windir%\\System32\\WindowsPowerShell\\v1.0\\PowerShell.exe -NoProfile -NoLogo -ExecutionPolicy unrestricted -Command "C:\\inetpub\\wwwroot\\mobile-builds\\$branch\\$build\\scripts\\iis.ps1 -branch $branch -build $build" """
}

void teams_success(message) {
  withCredentials([string(credentialsId: 'teams-notification-url', variable: 'TEAMS_URL')]) {
    def url = env.TEAMS_URL
    office365ConnectorSend(
        webhookUrl: "${url}",
        color: '#93d374',
        message: message,
        status: 'SUCCESS'
    )
  }
}

void teams_failure(message) {
  withCredentials([string(credentialsId: 'teams-notification-url', variable: 'TEAMS_URL')]) {
    def url = env.TEAMS_URL
    office365ConnectorSend(
        webhookUrl: "${url}",
        color: '#e57260',
        message: message,
        status: 'FAILURE'
    )
  }
}
