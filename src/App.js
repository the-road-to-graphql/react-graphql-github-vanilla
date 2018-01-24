import React, { Component } from 'react';
import axios from 'axios';

const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Authorization': `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
  },
});

const title = 'Simple React GraphQL GitHub Client';

const getIssuesOfRepositoryQuery = (organization, repository) => `
  {
    organization(login: "${organization}") {
      name
      url
      repository(name: "${repository}") {
        name
        url
        issues(last: 3, states: [OPEN]) {
          edges {
            cursor
            node {
              id
              title
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

const getAddReactionToIssueQuery = (issueId) => `
  mutation {
    addReaction(input:{subjectId:"${issueId}",content:HOORAY}) {
      reaction {
        content
      }
      subject {
        id
      }
    }
  }
`

const addReactionToIssue = (issueId) => {
  axiosGitHubGraphQL
    .post('/graphql', {
      query: getAddReactionToIssueQuery(issueId)
    })
  }

const getIssuesOfRepository = (path) => {
  const [organization, repository] = path.split('/');

  return axiosGitHubGraphQL
    .post('/graphql', {
      query: getIssuesOfRepositoryQuery(organization, repository)
    });
}

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      input: 'the-road-to-learn-react/the-road-to-learn-react',
      data: null,
      errors: null,
    };

    this.onSubmit = this.onSubmit.bind(this);
  }

  componentDidMount() {
    this.onFetchGitHub(this.state.input);
  }

  onSubmit(event) {
    this.onFetchGitHub(this.state.input);

    event.preventDefault();
  }

  onFetchGitHub(input) {
    getIssuesOfRepository(input)
      .then(result => this.setState(() => ({
        data: result.data.data,
        errors: result.data.errors,
      })));
  }

  render() {
    const { data, errors, input } = this.state;

    return (
      <div>
        <h1>{title}</h1>

        <form onSubmit={this.onSubmit}>
          <label htmlFor="repositoryUrl">Show open issues for https://github.com/</label>
          {' '}
          <input
            id="repositoryUrl"
            type="text"
            value={input}
            onChange={(event) => this.setState({ input: event.target.value })}
            style={{ width: '300px' }}
          />
          <button type="submit">Search</button>
        </form>

        { errors
          ? <p><strong>Somethine went wrong:</strong> {errors[0].message}</p>
          : <Organization { ...data } />
        }
      </div>
    );
  }
}

const Organization = ({ organization }) =>
  organization ? (
    <Repository { ...organization.repository } />
  ) : (
    <p>No data yet ...</p>
  )

const Repository = ({ issues }) =>
  <div>
    <ul>
      {issues.edges.map(edge =>
        <li key={edge.node.id}>
          <strong>{edge.node.title}</strong>

          <button type="button" onClick={() => addReactionToIssue(edge.node.id)}>Horray</button>

          <ul>
            {edge.node.reactions.edges.map(reaction =>
              <span key={reaction.node.id}>{reaction.node.content}</span>
            )}
          </ul>
        </li>
      )}
    </ul>
  </div>

export default App;